/*==================================================
  Modules
  ==================================================*/

import fs from 'fs';
import util from '../../sdk/util';
import chainWeb3 from '../../sdk/web3SDK/chainWeb3';
import basicUtil from '../../sdk/helpers/basicUtil';

/*==================================================
  Settings
  ==================================================*/

const BRIDGE_ADDRESS =
  '0:36122a25a11e8772dc5d94f5f6a653d4661f6e474bc85cb275aece185acd62a4';
const STAKING_ADDRESS =
  '0:ec6a2fd6c3732e494684d016f1addec1a1828b6b7ecfcd30b34e8e5ad2d421d0';

/*==================================================
  TVL
  ==================================================*/

async function tvl(params) {
  const { block, chain, provider } = params;

  const web3 = chainWeb3.getWeb3(chain);

  let tokens = {};
  try {
    tokens = basicUtil.readDataFromFile('store.json', chain, provider);
  } catch {}

  const [tokenBalances, stakeBalances] = await Promise.all([
    web3.eth.getBalances(BRIDGE_ADDRESS, block),
    web3.eth.getBalances(STAKING_ADDRESS, block),
  ]);

  tokenBalances.push(...stakeBalances);

  const newTokens = tokenBalances
    .map((data) => data.token)
    .filter((token) => !tokens[token]);

  if (newTokens.length > 0) {
    const tokensData = await Promise.all(
      newTokens.map((token) => web3.eth.getTokenData(token, block)),
    );
    tokensData.forEach((data, index) => {
      if (data) {
        tokens[newTokens[index]] = {
          name: data.name,
          symbol: data.symbol,
          decimals: data.decimals,
        };
      }
    });

    basicUtil.writeDataToFile(tokens, 'store.json', chain, provider);
  }

  tokenBalances.forEach((data) => {
    data.balance = data.balance.times(10 ** tokens[data.token].decimals);
  });

  const balances = {};

  util.sumMultiBalanceOf(balances, tokenBalances);
  util.convertBalancesToFixed(balances);

  return { balances };
}

export { tvl };