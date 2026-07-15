#![no_std]
//! Rupia.fi vault — single-asset MVP.
//! User deposits underlying (e.g. USDC), receives basket shares.
//! NAV per share = total underlying held / total shares. Yield arriving in
//! the vault (Blend interest, in prod) auto-raises NAV since NAV reads the
//! live balance.
//!
//! ponytail: shares tracked in an internal ledger, not a real token. Swap for
//! a Stellar Asset Contract in v2 if wallet-visible basket tokens are needed.
//! ponytail: single underlying only. Multi-asset basket + Soroswap routing is
//! the next contract iteration (see plan.md Fase 1).

use soroban_sdk::{contract, contracterror, contractimpl, contracttype, token, Address, Env};

/// Fixed-point scale for NAV (Stellar uses 7 decimals).
const SCALE: i128 = 10_000_000;
const BPS_DENOM: i128 = 10_000;

#[contracttype]
#[derive(Clone)]
enum DataKey {
    Admin,
    Underlying,
    FeeBps,
    TotalSupply,
    Balance(Address),
}

#[contracterror]
#[derive(Copy, Clone, Debug, Eq, PartialEq)]
#[repr(u32)]
pub enum Error {
    AlreadyInitialized = 1,
    NotInitialized = 2,
    InvalidAmount = 3,
    InvalidFee = 4,
    InsufficientShares = 5,
    ZeroShares = 6,
}

#[contract]
pub struct Vault;

#[contractimpl]
impl Vault {
    /// One-time setup. `fee_bps` charged on mint, sent to admin as revenue.
    pub fn initialize(
        env: Env,
        admin: Address,
        underlying: Address,
        fee_bps: u32,
    ) -> Result<(), Error> {
        if env.storage().instance().has(&DataKey::Admin) {
            return Err(Error::AlreadyInitialized);
        }
        if fee_bps as i128 >= BPS_DENOM {
            return Err(Error::InvalidFee);
        }
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Underlying, &underlying);
        env.storage().instance().set(&DataKey::FeeBps, &fee_bps);
        env.storage().instance().set(&DataKey::TotalSupply, &0i128);
        Ok(())
    }

    /// Deposit `amount` underlying, receive shares. Fee skimmed to admin.
    /// shares = net * total_supply / underlying_before  (bootstrap 1:1 first deposit).
    pub fn mint(env: Env, user: Address, amount: i128) -> Result<i128, Error> {
        user.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let underlying = Self::underlying_addr(&env)?;
        let token = token::TokenClient::new(&env, &underlying);
        let contract = env.current_contract_address();

        let supply = Self::supply(&env);
        let held_before = token.balance(&contract); // NAV basis, before this deposit

        let fee_bps = Self::fee_bps(&env) as i128;
        let fee = amount * fee_bps / BPS_DENOM;
        let net = amount - fee;
        if net <= 0 {
            return Err(Error::InvalidAmount);
        }

        if fee > 0 {
            let admin = Self::admin(&env)?;
            token.transfer(&user, &admin, &fee);
        }
        token.transfer(&user, &contract, &net);

        let shares = if supply == 0 {
            net
        } else {
            net * supply / held_before
        };
        if shares <= 0 {
            return Err(Error::ZeroShares);
        }

        Self::set_balance(&env, &user, Self::balance(env.clone(), user.clone()) + shares);
        env.storage()
            .instance()
            .set(&DataKey::TotalSupply, &(supply + shares));
        Ok(shares)
    }

    /// Burn `shares`, receive proportional underlying.
    /// amount_out = shares * underlying_held / total_supply.
    pub fn redeem(env: Env, user: Address, shares: i128) -> Result<i128, Error> {
        user.require_auth();
        if shares <= 0 {
            return Err(Error::InvalidAmount);
        }
        let bal = Self::balance(env.clone(), user.clone());
        if bal < shares {
            return Err(Error::InsufficientShares);
        }
        let underlying = Self::underlying_addr(&env)?;
        let token = token::TokenClient::new(&env, &underlying);
        let contract = env.current_contract_address();

        let supply = Self::supply(&env);
        let held = token.balance(&contract);
        let amount_out = shares * held / supply;

        Self::set_balance(&env, &user, bal - shares);
        env.storage()
            .instance()
            .set(&DataKey::TotalSupply, &(supply - shares));

        if amount_out > 0 {
            token.transfer(&contract, &user, &amount_out);
        }
        Ok(amount_out)
    }

    /// Demo helper: pull `amount` underlying from `funder` into the vault to
    /// simulate Blend yield. NAV rises for all holders.
    /// ponytail: mock. Prod replaces with real Blend supply/withdraw.
    pub fn simulate_yield(env: Env, funder: Address, amount: i128) -> Result<(), Error> {
        funder.require_auth();
        if amount <= 0 {
            return Err(Error::InvalidAmount);
        }
        let token = token::TokenClient::new(&env, &Self::underlying_addr(&env)?);
        token.transfer(&funder, &env.current_contract_address(), &amount);
        Ok(())
    }

    // ---- views ----

    /// NAV per share, scaled by SCALE (1.0 == SCALE). Returns SCALE if empty.
    pub fn nav(env: Env) -> i128 {
        let supply = Self::supply(&env);
        if supply == 0 {
            return SCALE;
        }
        let underlying = match Self::underlying_addr(&env) {
            Ok(a) => a,
            Err(_) => return SCALE,
        };
        let held = token::TokenClient::new(&env, &underlying)
            .balance(&env.current_contract_address());
        held * SCALE / supply
    }

    /// Total underlying backing the vault — proof-of-reserve.
    pub fn total_underlying(env: Env) -> i128 {
        match Self::underlying_addr(&env) {
            Ok(a) => token::TokenClient::new(&env, &a).balance(&env.current_contract_address()),
            Err(_) => 0,
        }
    }

    pub fn balance(env: Env, user: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Balance(user))
            .unwrap_or(0)
    }

    pub fn total_supply(env: Env) -> i128 {
        Self::supply(&env)
    }

    pub fn underlying(env: Env) -> Result<Address, Error> {
        Self::underlying_addr(&env)
    }

    // ---- internal ----

    fn supply(env: &Env) -> i128 {
        env.storage()
            .instance()
            .get(&DataKey::TotalSupply)
            .unwrap_or(0)
    }

    fn fee_bps(env: &Env) -> u32 {
        env.storage().instance().get(&DataKey::FeeBps).unwrap_or(0)
    }

    fn admin(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Admin)
            .ok_or(Error::NotInitialized)
    }

    fn underlying_addr(env: &Env) -> Result<Address, Error> {
        env.storage()
            .instance()
            .get(&DataKey::Underlying)
            .ok_or(Error::NotInitialized)
    }

    fn set_balance(env: &Env, user: &Address, v: i128) {
        env.storage()
            .persistent()
            .set(&DataKey::Balance(user.clone()), &v);
    }
}

mod test;
