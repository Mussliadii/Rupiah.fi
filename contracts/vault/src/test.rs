#![cfg(test)]

use super::*;
use soroban_sdk::{
    testutils::Address as _,
    token::{StellarAssetClient, TokenClient},
    Address, Env,
};

const SCALE: i128 = 10_000_000;

struct Setup<'a> {
    env: Env,
    vault: VaultClient<'a>,
    token: TokenClient<'a>,
    sac: StellarAssetClient<'a>,
    admin: Address,
}

fn setup(fee_bps: u32) -> Setup<'static> {
    let env = Env::default();
    env.mock_all_auths();

    let admin = Address::generate(&env);
    let issuer = Address::generate(&env);

    // Deploy a Stellar Asset Contract to act as USDC.
    let sac_reg = env.register_stellar_asset_contract_v2(issuer.clone());
    let token_addr = sac_reg.address();
    let token = TokenClient::new(&env, &token_addr);
    let sac = StellarAssetClient::new(&env, &token_addr);

    let vault_addr = env.register(Vault, ());
    let vault = VaultClient::new(&env, &vault_addr);
    vault.initialize(&admin, &token_addr, &fee_bps);

    Setup {
        env,
        vault,
        token,
        sac,
        admin,
    }
}

fn fund(s: &Setup, who: &Address, amount: i128) {
    s.sac.mint(who, &amount);
}

#[test]
fn first_deposit_mints_one_to_one() {
    let s = setup(0);
    let user = Address::generate(&s.env);
    fund(&s, &user, 1_000 * SCALE);

    let shares = s.vault.mint(&user, &(1_000 * SCALE));
    assert_eq!(shares, 1_000 * SCALE);
    assert_eq!(s.vault.total_supply(), 1_000 * SCALE);
    assert_eq!(s.vault.nav(), SCALE); // NAV == 1.0
    assert_eq!(s.vault.total_underlying(), 1_000 * SCALE);
}

#[test]
fn round_trip_returns_principal_when_no_fee() {
    let s = setup(0);
    let user = Address::generate(&s.env);
    fund(&s, &user, 500 * SCALE);

    let shares = s.vault.mint(&user, &(500 * SCALE));
    let out = s.vault.redeem(&user, &shares);

    assert_eq!(out, 500 * SCALE);
    assert_eq!(s.vault.total_supply(), 0);
    assert_eq!(s.token.balance(&user), 500 * SCALE);
}

#[test]
fn fee_goes_to_admin_and_reduces_shares() {
    let s = setup(100); // 1%
    let user = Address::generate(&s.env);
    fund(&s, &user, 1_000 * SCALE);

    let shares = s.vault.mint(&user, &(1_000 * SCALE));
    // 1% fee -> 990 net deposited, first deposit so shares == net.
    assert_eq!(shares, 990 * SCALE);
    assert_eq!(s.token.balance(&s.admin), 10 * SCALE);
    assert_eq!(s.vault.total_underlying(), 990 * SCALE);
}

#[test]
fn yield_raises_nav_and_second_depositor_gets_fewer_shares() {
    let s = setup(0);
    let alice = Address::generate(&s.env);
    let bob = Address::generate(&s.env);
    let sponsor = Address::generate(&s.env);
    fund(&s, &alice, 1_000 * SCALE);
    fund(&s, &bob, 1_000 * SCALE);
    fund(&s, &sponsor, 1_000 * SCALE);

    let a_shares = s.vault.mint(&alice, &(1_000 * SCALE));
    assert_eq!(a_shares, 1_000 * SCALE);

    // 10% yield arrives. NAV -> 1.1
    s.vault.simulate_yield(&sponsor, &(100 * SCALE));
    assert_eq!(s.vault.nav(), SCALE * 11 / 10);

    // Bob deposits 1000 at NAV 1.1 -> shares = 1000 * 1000 / 1100 = 909.09...
    let b_shares = s.vault.mint(&bob, &(1_000 * SCALE));
    assert!(b_shares < a_shares, "later depositor gets fewer shares");
    assert_eq!(b_shares, 1_000 * SCALE * (1_000 * SCALE) / (1_100 * SCALE));

    // Alice still owns more of the pool than Bob -> redeems more.
    let a_out = s.vault.redeem(&alice, &a_shares);
    let b_out = s.vault.redeem(&bob, &b_shares);
    assert!(a_out > b_out, "alice captured the yield");
    assert!(a_out > 1_000 * SCALE, "alice profits from yield");
}

#[test]
fn redeem_more_than_owned_fails() {
    let s = setup(0);
    let user = Address::generate(&s.env);
    fund(&s, &user, 100 * SCALE);
    let shares = s.vault.mint(&user, &(100 * SCALE));

    let r = s.vault.try_redeem(&user, &(shares + 1));
    assert_eq!(r, Err(Ok(Error::InsufficientShares)));
}

#[test]
fn mint_zero_fails() {
    let s = setup(0);
    let user = Address::generate(&s.env);
    fund(&s, &user, 10 * SCALE);
    let r = s.vault.try_mint(&user, &0);
    assert_eq!(r, Err(Ok(Error::InvalidAmount)));
}

#[test]
fn double_initialize_fails() {
    let s = setup(0);
    let other = Address::generate(&s.env);
    let r = s.vault.try_initialize(&s.admin, &other, &0);
    assert_eq!(r, Err(Ok(Error::AlreadyInitialized)));
}

#[test]
fn fee_at_or_above_100pct_rejected() {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let issuer = Address::generate(&env);
    let sac = env.register_stellar_asset_contract_v2(issuer);
    let vault_addr = env.register(Vault, ());
    let vault = VaultClient::new(&env, &vault_addr);
    let r = vault.try_initialize(&admin, &sac.address(), &10_000);
    assert_eq!(r, Err(Ok(Error::InvalidFee)));
}
