import { BigNumber } from "bignumber.js";
// import { FeeTooHigh } from "@ledgerhq/errors";
import type { CurrenciesData } from "../../../types";
import type { NetworkInfoRaw, Transaction } from "../types";
import { fromTransactionRaw } from "../transaction";
import scanAccounts1 from "./bitcoin.scanAccounts.1";
const networkInfo: NetworkInfoRaw = {
  family: "bitcoin",
  feeItems: {
    items: [
      {
        key: "0",
        speed: "high",
        feePerByte: "3",
      },
      {
        key: "1",
        speed: "standard",
        feePerByte: "2",
      },
      {
        key: "2",
        speed: "low",
        feePerByte: "1",
      },
    ],
    defaultFeePerByte: "1",
  },
};
const dataset: CurrenciesData<Transaction> = {
  FIXME_ignoreAccountFields: [
    "bitcoinResources.walletAccount", // it is not "stable"
    "bitcoinResources.utxos", // TODO: fix ordering
  ],
  scanAccounts: [scanAccounts1],
  accounts: [
    {
      transactions: [
        {
          name: "on legacy recipient",
          transaction: fromTransactionRaw({
            family: "bitcoin",
            recipient: "1Cz2ZXb6Y6AacXJTpo4RBjQMLEmscuxD8e",
            amount: "999",
            feePerByte: "1",
            networkInfo,
            rbf: false,
            utxoStrategy: {
              strategy: 0,
              pickUnconfirmedRBF: false,
              excludeUTXOs: [],
            },
          }),
          expectedStatus: {
            amount: new BigNumber("999"),
            // FIXME fee are reloaded?
            // estimatedFees: new BigNumber("250"),
            // totalSpent: new BigNumber("1249"),
            errors: {},
            warnings: {
              // feeTooHigh: new FeeTooHigh()
            },
          },
        },
        {
          name: "on segwit recipient",
          transaction: fromTransactionRaw({
            family: "bitcoin",
            recipient: "34N7XoKANmM66ZQDyQf2j8hPaTo6v5X8eA",
            amount: "998",
            feePerByte: "1",
            networkInfo,
            rbf: false,
            utxoStrategy: {
              strategy: 0,
              pickUnconfirmedRBF: false,
              excludeUTXOs: [],
            },
          }),
          expectedStatus: {
            amount: new BigNumber("998"),
            // FIXME fee are reloaded?
            // estimatedFees: new BigNumber("250"),
            // totalSpent: new BigNumber("1248"),
            errors: {},
            warnings: {
              // feeTooHigh: new FeeTooHigh()
            },
          },
        },
        {
          name: "on native segwit recipient",
          transaction: fromTransactionRaw({
            family: "bitcoin",
            recipient: "BC1QQMXQDRKXGX6SWRVJL9L2E6SZVVKG45ALL5U4FL",
            amount: "997",
            feePerByte: "1",
            networkInfo,
            rbf: false,
            utxoStrategy: {
              strategy: 0,
              pickUnconfirmedRBF: false,
              excludeUTXOs: [],
            },
          }),
          expectedStatus: {
            amount: new BigNumber("997"),
            // FIXME fee are reloaded?
            // estimatedFees: new BigNumber("250"),
            // totalSpent: new BigNumber("1247"),
            errors: {},
            warnings: {
              // feeTooHigh: new FeeTooHigh(),
            },
          },
        },
      ],
      raw: {
        id: "libcore:1:bitcoin:xpub6BuPWhjLqutPV8SF4RMrrn8c3t7uBZbz4CBbThpbg9GYjqRMncra9mjgSfWSK7uMDz37hhzJ8wvkbDDQQJt6VgwLoszvmPiSBtLA1bPLLSn:",
        seedIdentifier:
          "041caa3a42db5bdd125b2530c47cfbe829539b5a20a5562ec839d241c67d1862f2980d26ebffee25e4f924410c3316b397f34bd572543e72c59a7569ef9032f498",
        name: "Bitcoin 1 (legacy)",
        derivationMode: "",
        index: 0,
        freshAddress: "17gPmBH8b6UkvSmxMfVjuLNAqzgAroiPSe",
        freshAddressPath: "44'/0'/0'/0/59",
        freshAddresses: [
          {
            address: "17gPmBH8b6UkvSmxMfVjuLNAqzgAroiPSe",
            derivationPath: "44'/0'/0'/0/59",
          },
        ],
        pendingOperations: [],
        operations: [],
        currencyId: "bitcoin",
        unitMagnitude: 8,
        balance: "2757",
        blockHeight: 0,
        lastSyncDate: "",
        xpub: "xpub6BuPWhjLqutPV8SF4RMrrn8c3t7uBZbz4CBbThpbg9GYjqRMncra9mjgSfWSK7uMDz37hhzJ8wvkbDDQQJt6VgwLoszvmPiSBtLA1bPLLSn",
      },
    },
    {
      raw: {
        id: "libcore:1:bitcoin:xpub6DEHKg8fgKcb9at2u9Xhjtx4tXGyWqUPQAx2zNCzr41gQRyCqpCn7onSoJU4VS96GXyCtAhhFxErnG2pGVvVexaqF7DEfqGGnGk7Havn7C2:native_segwit",
        seedIdentifier:
          "043188c7e9e184aa3f6c2967b9b2b19a5966efe88c526ac091687642540573ecfb4c988261e7b0b876c6aec0b393518676232b34289a5bfc0cc78cc2ef735fa512",
        name: "Bitcoin 2 (native segwit)",
        derivationMode: "native_segwit",
        index: 1,
        freshAddress: "bc1q8vp7v5wyv8nvhsh5p2dvkgalep4q325kd5xk4e",
        freshAddressPath: "84'/0'/1'/0/53",
        freshAddresses: [
          {
            address: "bc1q8vp7v5wyv8nvhsh5p2dvkgalep4q325kd5xk4e",
            derivationPath: "84'/0'/1'/0/53",
          },
        ],
        blockHeight: 0,
        operations: [],
        pendingOperations: [],
        currencyId: "bitcoin",
        unitMagnitude: 8,
        lastSyncDate: "",
        balance: "2717",
        xpub: "xpub6DEHKg8fgKcb9at2u9Xhjtx4tXGyWqUPQAx2zNCzr41gQRyCqpCn7onSoJU4VS96GXyCtAhhFxErnG2pGVvVexaqF7DEfqGGnGk7Havn7C2",
      },
    },
  ],
};
export default dataset;
