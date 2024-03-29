import {
  Transfer
} from "../generated/paxg/paxg";
import { createOrUpdateBalance, loadOrCreateAddress, loadOrCreateAddressTransfer, loadOrCreateToken, loadOrCreateTransfer, updateStats } from "./entities";
import { convertTokenToDecimal } from "./utils";
import { findUsdPerTokenOnChain } from "./utils/pricing";

export function handleTransfer(event: Transfer): void {
  const token = loadOrCreateToken(event.address);
  const stats = updateStats();

  const addresses = [event.params.from, event.params.to];
  const amount = convertTokenToDecimal(event.params.value, token.decimals);
  const amountWeight = amount.times(token.weight);
  const amountUsd = findUsdPerTokenOnChain(token).times(amount);

  //1. create Transfer entity
  loadOrCreateTransfer(stats.transferCount, event.transaction.hash, event.block.timestamp, addresses, token, amount, amountWeight, amountUsd);
  //2. create Address entity with the sender and receiver address
  const address0 = loadOrCreateAddress(addresses[0]);
  const address1 = loadOrCreateAddress(addresses[1]);
  //3. create Balance entity with the sender and receiver address
  createOrUpdateBalance(address0, token);
  createOrUpdateBalance(address1, token);

  loadOrCreateAddressTransfer(address0, stats.transferCount);
  loadOrCreateAddressTransfer(address1, stats.transferCount);
}
