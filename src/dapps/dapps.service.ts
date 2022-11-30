import { Injectable } from '@nestjs/common';
import { GetTvlReply } from '../generated/dappradar-proto/defi-providers';

@Injectable()
export class DappsService {
  async getTvl(
    provider: string,
    chain: string | undefined,
    block: string,
    date: string | undefined,
  ): Promise<GetTvlReply> {
    console.log('provider', typeof provider, provider);
    console.log('chain', typeof chain, chain);
    console.log('block', typeof block, block);
    console.log('date', typeof date, date);

    // TO DO: check if chain exists
    //const chain = 'optimism' && data.CHAINS['optimism'] ? 'optimism' : 'ethereum';

    const providerService = await import(
      chain === 'ethereum'
        ? `./providers/${provider}`
        : `./providers/${chain}_${provider}/index`
    );

    const tvlData = await providerService.tvl(block, chain, provider, date);
    console.log(tvlData);
    return tvlData;
  }
}