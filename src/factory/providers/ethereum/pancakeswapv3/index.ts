import { ITvlParams, ITvlReturn } from '../../../../interfaces/ITvl';
import pancakeswapV3subgraph from '../../../../util/calculators/pancakeswapV3subgraph';

const START_BLOCK = 16950686;
const THE_GRAPH_API_KEY = process.env?.THE_GRAPH_API_KEY;
const THEGRAPTH_ENDPOINT = `https://gateway-arbitrum.network.thegraph.com/api/${THE_GRAPH_API_KEY}/subgraphs/id/JAGXF8B14mpB8QGKnwhKTs5JxsQZBJQvbDGFcWwL7gbm`;

async function tvl(params: ITvlParams): Promise<Partial<ITvlReturn>> {
  const { chain, provider, web3 } = params;
  const block = params.block - 100;

  if (block < START_BLOCK) {
    return { balances: {} };
  }
  const balances = await pancakeswapV3subgraph.getTvlFromSubgraph(
    THEGRAPTH_ENDPOINT,
    block,
  );

  return { balances };
}

export { tvl };
