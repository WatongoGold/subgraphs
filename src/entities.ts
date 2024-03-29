import { Address, BigDecimal, BigInt, Bytes } from "@graphprotocol/graph-ts";
import { ERC20 } from "../generated/paxg/ERC20";
import { Address as OwnerAddress, AddressTransfer, Balance, Stats, Token, Transfer } from "../generated/schema";
import { convertTokenToDecimal, fetchTokenDecimals, fetchTokenName, fetchTokenSupply, fetchTokenSymbol } from "./utils";
import { CACHE_ADDRESS, CACHE_WEIGHT, ONE_BD, ONE_BI, PAXG_ADDRESS, PAXG_WEIGHT, TETHERG_ADDRESS, TETHERG_WEIGHT, ZERO_BI } from "./utils/constant";
import { findUsdPerTokenOnChain } from "./utils/pricing";

export function loadOrCreateTransfer(eventIndex: BigInt, txHash: Bytes, timestamp: BigInt, addresses: Address[], token: Token, amount: BigDecimal, amountWeight: BigDecimal, amountUsd: BigDecimal): Transfer {
    let transfer = Transfer.load(eventIndex.toString());

    if (transfer === null) {
        transfer = new Transfer(eventIndex.toString());
        transfer.timestamp = timestamp;
        transfer.from = addresses[0];
        transfer.to = addresses[1];
        transfer.token = token.id;
        transfer.txHash = txHash.toHexString();

        transfer.amount = amount;
        transfer.amountWeight = amountWeight;
        transfer.amountUsd = amountUsd;
        transfer.save();
    }

    return transfer as Transfer;
}

export function loadOrCreateToken(address: Address): Token {
    let token = Token.load(address.toHexString());

    if (token === null) {
        let tokenWeight = ONE_BD;
        if (address.toHexString() == PAXG_ADDRESS.toHexString())
            tokenWeight = BigDecimal.fromString(PAXG_WEIGHT);
        if (address.toHexString() == TETHERG_ADDRESS.toHexString())
            tokenWeight = BigDecimal.fromString(TETHERG_WEIGHT);
        if (address.toHexString() == CACHE_ADDRESS.toHexString())
            tokenWeight = BigDecimal.fromString(CACHE_WEIGHT);

        token = new Token(address.toHexString());
        token.weight = tokenWeight;
        token.decimals = fetchTokenDecimals(address);
        token.ticker = fetchTokenSymbol(address);
        token.totalSupply = fetchTokenSupply(address);
        token.name = fetchTokenName(address);
        token.save()
    }

    return token as Token;
}

export function loadOrCreateAddress(address: Address): OwnerAddress {
    let ownerAddress = OwnerAddress.load(address.toHexString());

    if (ownerAddress === null) {
        ownerAddress = new OwnerAddress(address.toHexString());
        ownerAddress.save()
    }

    return ownerAddress as OwnerAddress;
}

export function updateStats(): Stats {
    let stats = Stats.load(ONE_BI.toString());

    if (stats === null) {
        stats = new Stats(ONE_BI.toString());
        stats.transferCount = ZERO_BI;
        stats.save();
    } else {
        const transferCount = stats.transferCount.plus(ONE_BI);
        stats.transferCount = transferCount;
        stats.save();
    }

    return stats as Stats;
}

export function loadOrCreateAddressTransfer(address: OwnerAddress, transferCount: BigInt): AddressTransfer {
    const id = address.id.concat(transferCount.toString());
    let addressTransfer = AddressTransfer.load(id);

    if (addressTransfer === null) {
        addressTransfer = new AddressTransfer(id);
        addressTransfer.address = address.id;
        addressTransfer.transfer = transferCount.toString();
        addressTransfer.countId = transferCount;
        addressTransfer.save()
    }

    return addressTransfer as AddressTransfer;
}

export function createOrUpdateBalance(address: OwnerAddress, token: Token): Balance {
    const id = token.id.concat('-').concat(address.id);
    let balance = Balance.load(id);

    if (balance === null) {
        balance = new Balance(id);
        balance.address = address.id;
        balance.token = token.id;
    }

    const ercToken = ERC20.bind(Address.fromString(token.id));
    const addressBalance = ercToken.balanceOf(Address.fromString(address.id));

    const amount = convertTokenToDecimal(addressBalance, token.decimals);
    const amountWeight = amount.times(token.weight);
    const amountUsd = findUsdPerTokenOnChain(token).times(amount);

    balance.amount = amount;
    balance.amountWeight = amountWeight;
    balance.amountUsd = amountUsd;
    balance.save();

    return balance as Balance;
}