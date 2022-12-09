/*==================================================
  Modules
  ==================================================*/

const fs = require("fs");
const BigNumber = require("bignumber.js");
const POOL_ABI = require("./abis/pool.json");
const TOKEN_ABI = require("./abis/token.json");
const CURVE_ABI = require("./abis/curve.json");
const util = require("../../sdk/util");

/*==================================================
  Settings
  ==================================================*/

const POOLS = [
  "0xFFffFfffFff5d3627294FeC5081CE5C5D7fA6451", // Stability Pool
  "0xAAAaaAaaAaDd4AA719f0CF8889298D13dC819A15", // Active Pool
  "0xdDDDDDdDDD3AD7297B3D13E17414fBED370cd425", // Default Pool
  "0x5555555598B91C1df1C065E8E3a50fF846653968", // CollSurplus Pool
];

const FARM_ADDRESS = "0xfffFffFFfFe8aA117FE603a37188E666aF110F39";
const BOOST_CURVE_LP_FARM_ADDRESS =
  "0xD8A4AA01D54C8Fdd104EAC28B9C975f0663E75D8";
const YUSDCURVE_POOL_ADDRESS = "0x1da20ac34187b2d9c74f729b85acb225d3341b25";

const CURVE_DAI_USDC_USDT = "0x1337bedc9d22ecbe766df105c9623922a27963ec";
const USDC = "0xb97ef9ef8734c71904d8002f8b6bc66dd9c48a6e";

/*==================================================
  TVL
  ==================================================*/

async function tvl(block) {
  if (block < 13442314) {
    return {};
  }

  let store = {};
  try {
    store = JSON.parse(
      fs.readFileSync("./providers/avalanche_yetifinance/store.json", "utf8")
    );
  } catch {}

  const results = await util.executeCallOfMultiTargets(
    POOLS,
    POOL_ABI,
    "getAllCollateral",
    [],
    block
  );

  if (!store.underlyings) {
    store.underlyings = {};
  }

  const collateralBalances = [];
  const newTokens = {};
  results.forEach((result) => {
    if (result) {
      const tokens = result[0].split(",");
      const amounts = result[1].split(",");
      tokens.forEach((token, index) => {
        const address = token.toLowerCase();
        if (!store.underlyings[address]) {
          newTokens[address] = true;
        }
        collateralBalances.push({
          token: address,
          balance: BigNumber(amounts[index]),
        });
      });
    }
  });

  const noUnderlyingTokens = Object.keys(newTokens);

  if (noUnderlyingTokens.length > 0) {
    const underlyings = await util.executeCallOfMultiTargets(
      noUnderlyingTokens,
      TOKEN_ABI,
      "underlying",
      [],
      block
    );
    underlyings.forEach((underlying, index) => {
      if (underlying) {
        store.underlyings[noUnderlyingTokens[index]] =
          underlying.toLowerCase();
      }
    });

    fs.writeFile(
      "./providers/avalanche_yetifinance/store.json",
      JSON.stringify(store, null, 2),
      "utf8",
      function (err) {
        if (err) {
          console.error(err);
        }
      }
    );
  }

  const farmTotalSupplies = await util.getTokenTotalSupplies(
    [FARM_ADDRESS, BOOST_CURVE_LP_FARM_ADDRESS],
    block
  );
  const virtualPrice = await util.executeCall(
    YUSDCURVE_POOL_ADDRESS,
    CURVE_ABI,
    "get_virtual_price",
    [],
    block
  );

  if (virtualPrice) {
    let farmTvl = BigNumber(0);
    farmTotalSupplies.forEach((result) => {
      if (result) {
        farmTvl = farmTvl.plus(result.totalSupply);
      }
    });

    collateralBalances.push({
      token: USDC,
      balance: farmTvl.times(virtualPrice).div(1e18).div(1e18).times(1e6),
    });
  }

  const tokenBalances = {};
  util.sumMultiBalanceOf(tokenBalances, collateralBalances);

  const yetiTokens = Object.keys(store.underlyings);
  const totalSupplies = await util.executeCallOfMultiTargets(
    yetiTokens,
    TOKEN_ABI,
    "totalSupply",
    [],
    block
  );
  const perReceipts = await util.executeCallOfMultiTargets(
    yetiTokens,
    TOKEN_ABI,
    "underlyingPerReceipt",
    [],
    block
  );

  yetiTokens.forEach((token, index) => {
    if (totalSupplies[index] && perReceipts[index]) {
      delete tokenBalances[token];
      if (store.underlyings[token] == CURVE_DAI_USDC_USDT) {
        tokenBalances[USDC] = BigNumber(tokenBalances[USDC] || 0).plus(
          BigNumber(totalSupplies[index])
            .times(perReceipts[index])
            .div(1e18)
            .div(1e12)
        );
      } else {
        tokenBalances[store.underlyings[token]] = BigNumber(
          tokenBalances[store.underlyings[token]] || 0
        ).plus(
          BigNumber(totalSupplies[index]).times(perReceipts[index]).div(1e18)
        );
      }
    }
  });

  const balances = await util.convertToUnderlyings(tokenBalances, block);
  console.log(balances);

  return balances;
}

/*==================================================
  Exports
  ==================================================*/

module.exports = {
  tvl,
};