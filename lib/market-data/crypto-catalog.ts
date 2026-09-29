export interface CryptoCatalogEntry {
  symbol: string;
  name: string;
  binanceTicker: string;
}

export const CRYPTO_CATALOG: CryptoCatalogEntry[] = [
  ["BTC", "Bitcoin"],
  ["ETH", "Ethereum"],
  ["BNB", "BNB"],
  ["SOL", "Solana"],
  ["XRP", "XRP"],
  ["ADA", "Cardano"],
  ["DOGE", "Dogecoin"],
  ["TRX", "TRON"],
  ["AVAX", "Avalanche"],
  ["SHIB", "Shiba Inu"],
  ["DOT", "Polkadot"],
  ["LINK", "Chainlink"],
  ["MATIC", "Polygon"],
  ["LTC", "Litecoin"],
  ["BCH", "Bitcoin Cash"],
  ["ATOM", "Cosmos"],
  ["UNI", "Uniswap"],
  ["ETC", "Ethereum Classic"],
  ["XLM", "Stellar"],
  ["NEAR", "NEAR Protocol"],
  ["APT", "Aptos"],
  ["FIL", "Filecoin"],
  ["ARB", "Arbitrum"],
  ["OP", "Optimism"],
  ["AAVE", "Aave"],
  ["ALGO", "Algorand"],
  ["SAND", "The Sandbox"],
  ["MANA", "Decentraland"],
  ["EGLD", "MultiversX"],
  ["ICP", "Internet Computer"],
  ["HBAR", "Hedera"],
  ["QNT", "Quant"],
  ["VET", "VeChain"],
  ["MKR", "Maker"],
  ["GRT", "The Graph"],
  ["INJ", "Injective"],
  ["RUNE", "THORChain"],
  ["SUI", "Sui"],
  ["SEI", "Sei"],
  ["PEPE", "Pepe"],
].map(([symbol, name]) => ({
  symbol,
  name,
  binanceTicker: `${symbol}USDT`,
}));

function normalizeSearchText(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function searchCryptoCatalog(query: string): CryptoCatalogEntry[] {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return CRYPTO_CATALOG;
  }

  return CRYPTO_CATALOG.filter((asset) => {
    return (
      normalizeSearchText(asset.symbol).includes(normalizedQuery) ||
      normalizeSearchText(asset.name).includes(normalizedQuery)
    );
  });
}

export function getCryptoBySymbol(
  symbol: string,
): CryptoCatalogEntry | undefined {
  const normalizedSymbol = symbol.trim().toUpperCase();
  return CRYPTO_CATALOG.find((asset) => asset.symbol === normalizedSymbol);
}
