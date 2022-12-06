import fetch from 'node-fetch';
import BigNumber from 'bignumber.js';
import serviceData from '../data';

const nodeUrl = serviceData[`EVERSCALE_NODE_URL`];

export default {
  eth: {
    getBlockNumber: async () => {
      return Math.floor(Date.now() / 1000);
    },
    getBlock: async (timestamp) => {
      const currentTimestamp = Math.floor(Date.now() / 1000);
      if (timestamp == 'latest') {
        return {
          number: currentTimestamp,
          timestamp: currentTimestamp,
        };
      }
      return {
        number: timestamp || currentTimestamp,
        timestamp: timestamp || currentTimestamp,
      };
    },
    getBalances: async (account) => {
      const res = await fetch(`${nodeUrl}/address/${account}/balances`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          limit: 100,
          offset: 0,
        }),
      })
        .then((res) => res.json())
        .then((res) => res.balances);

      return res.map((data) => ({
        token: data.rootAddress,
        balance: BigNumber(data.amount),
      }));
    },
    getTokenData: async (address) => {
      console.log('address', address);
      const res = await fetch(
        `${nodeUrl}/root_contract/root_address/${address}`,
      ).then((res) => res.json());
      console.log(res);
      return res;
    },
    Contract: class {
      abi: string;
      address: string;
      constructor(abi, address) {
        this.abi = abi;
        this.address = address;
      }

      get methods() {
        return {
          totalSupply: () => {
            return {
              call: async () => {
                const res = await fetch(
                  `${nodeUrl}/root_contract/root_address/${this.address}`,
                ).then((res) => res.json());
                return BigNumber(res.totalSupply)
                  .times(10 ** res.decimals)
                  .toFixed();
              },
            };
          },
        };
      }
    },
  },
};