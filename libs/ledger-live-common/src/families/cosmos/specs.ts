import expect from "expect";
import sample from "lodash/sample";
import sampleSize from "lodash/sampleSize";
import invariant from "invariant";
import { BigNumber } from "bignumber.js";
import type {
  CosmosDelegation,
  CosmosRedelegation,
  CosmosResources,
  CosmosUnbonding,
  Transaction,
} from "../../families/cosmos/types";
import { getCurrentCosmosPreloadData } from "../../families/cosmos/preloadedData";
import { getCryptoCurrencyById } from "../../currencies";
import { pickSiblings } from "../../bot/specs";
import type { AppSpec } from "../../bot/types";
import { toOperationRaw } from "../../account";
import {
  canClaimRewards,
  canDelegate,
  canUndelegate,
  canRedelegate,
  getMaxDelegationAvailable,
} from "./logic";
import { DeviceModelId } from "@ledgerhq/devices";

const minAmount = new BigNumber(20000);
const maxAccounts = 32;

// amounts of delegation are not exact so we are applying an approximation
function approximateValue(value) {
  return "~" + value.div(100).integerValue().times(100).toString();
}

function approximateExtra(extra) {
  extra = { ...extra };
  if (extra.validators && Array.isArray(extra.validators)) {
    extra.validators = extra.validators.map((v) => {
      if (!v) return v;
      const { amount, ...rest } = v;
      if (!amount || typeof amount !== "string") return v;
      return { ...rest, amount: approximateValue(new BigNumber(amount)) };
    });
  }
  return extra;
}

const cosmos: AppSpec<Transaction> = {
  name: "Cosmos",
  currency: getCryptoCurrencyById("cosmos"),
  appQuery: {
    model: DeviceModelId.nanoS,
    appName: "Cosmos",
  },
  testTimeout: 2 * 60 * 1000,
  transactionCheck: ({ maxSpendable }) => {
    invariant(maxSpendable.gt(minAmount), "balance is too low");
  },
  test: ({ account, operation, optimisticOperation }) => {
    const allOperationsMatchingId = account.operations.filter(
      (op) => op.id === operation.id
    );
    if (allOperationsMatchingId.length > 1) {
      console.warn(allOperationsMatchingId);
    }
    expect({ allOperationsMatchingId }).toEqual({
      allOperationsMatchingId: [operation],
    });
    const opExpected: Record<string, any> = toOperationRaw({
      ...optimisticOperation,
    });
    delete opExpected.value;
    delete opExpected.fee;
    delete opExpected.date;
    delete opExpected.blockHash;
    delete opExpected.blockHeight;
    const extra = opExpected.extra;
    delete opExpected.extra;
    const op = toOperationRaw(operation);
    expect(op).toMatchObject(opExpected);
    expect(approximateExtra(op.extra)).toMatchObject(approximateExtra(extra));
  },
  mutations: [
    {
      name: "send some",
      test: ({ account, accountBeforeTransaction, operation }) => {
        expect(account.balance.toString()).toBe(
          accountBeforeTransaction.balance.minus(operation.value).toString()
        );
      },
      transaction: ({ account, siblings, bridge, maxSpendable }) => {
        const amount = maxSpendable
          .times(0.3 + 0.4 * Math.random())
          .integerValue();
        invariant(amount.gt(0), "random amount to be positive");
        return {
          transaction: bridge.createTransaction(account),
          updates: [
            {
              recipient: pickSiblings(siblings, maxAccounts).freshAddress,
            },
            {
              amount,
            },
            Math.random() < 0.5
              ? {
                  memo: "LedgerLiveBot",
                }
              : null,
          ],
        };
      },
    },
    {
      name: "send max",
      maxRun: 1,
      transaction: ({ account, siblings, bridge }) => {
        return {
          transaction: bridge.createTransaction(account),
          updates: [
            {
              recipient: pickSiblings(siblings, maxAccounts).freshAddress,
            },
            {
              useAllAmount: true,
            },
          ],
        };
      },
      test: ({ account }) => {
        expect(account.spendableBalance.toString()).toBe("0");
      },
    },
    {
      name: "delegate new validators",
      maxRun: 1,
      transaction: ({ account, bridge }) => {
        invariant(
          account.index % 2 > 0,
          "only one out of 2 accounts is not going to delegate"
        );
        invariant(canDelegate(account), "can delegate");
        const { cosmosResources } = account;
        invariant(cosmosResources, "cosmos");
        invariant(
          (cosmosResources as CosmosResources).delegations.length < 3,
          "already enough delegations"
        );
        const data = getCurrentCosmosPreloadData();
        const count = 1 + Math.floor(2 * Math.random());
        let remaining = getMaxDelegationAvailable(account, count)
          .minus(minAmount.times(2))
          .times(0.5 * Math.random());
        invariant(remaining.gt(0), "not enough funds in account for delegate");
        const all = data.validators.filter(
          (v) =>
            !(cosmosResources as CosmosResources).delegations.some(
              // new delegations only
              (d) => d.validatorAddress === v.validatorAddress
            )
        );
        const validators = sampleSize(all, count)
          .map((delegation) => {
            // take a bit of remaining each time (less is preferred with the random() square)
            const amount = remaining
              .times(Math.random() * Math.random())
              .integerValue();
            remaining = remaining.minus(amount);
            return {
              address: delegation.validatorAddress,
              amount,
            };
          })
          .filter((v) => v.amount.gt(0));
        invariant(validators.length > 0, "no possible delegation found");
        return {
          transaction: bridge.createTransaction(account),
          updates: [
            {
              memo: "LedgerLiveBot",
              mode: "delegate",
            },
            ...validators.map((_, i) => ({
              validators: validators.slice(0, i + 1),
            })),
          ],
        };
      },
      test: ({ account, transaction }) => {
        const { cosmosResources } = account;
        invariant(cosmosResources, "cosmos");
        transaction.validators.forEach((v) => {
          const d = (cosmosResources as CosmosResources).delegations.find(
            (d) => d.validatorAddress === v.address
          );
          invariant(d, "delegated %s must be found in account", v.address);
          expect({
            address: v.address,
            amount: approximateValue(v.amount),
          }).toMatchObject({
            address: (d as CosmosDelegation).validatorAddress,
            amount: approximateValue((d as CosmosDelegation).amount),
          });
        });
      },
    },
    {
      name: "undelegate",
      maxRun: 3,
      transaction: ({ account, bridge }) => {
        invariant(canUndelegate(account), "can undelegate");
        const { cosmosResources } = account;
        invariant(cosmosResources, "cosmos");
        invariant(
          (cosmosResources as CosmosResources).delegations.length > 0,
          "already enough delegations"
        );
        const undelegateCandidate = sample(
          (cosmosResources as CosmosResources).delegations.filter(
            (d) =>
              !(cosmosResources as CosmosResources).redelegations.some(
                (r) =>
                  r.validatorSrcAddress === d.validatorAddress ||
                  r.validatorDstAddress === d.validatorAddress
              ) &&
              !(cosmosResources as CosmosResources).unbondings.some(
                (r) => r.validatorAddress === d.validatorAddress
              )
          )
        );
        invariant(undelegateCandidate, "already pending");

        const amount = (undelegateCandidate as CosmosDelegation).amount // most of the time, undelegate all
          .times(Math.random() > 0.3 ? 1 : Math.random())
          .integerValue();
        invariant(amount.gt(0), "random amount to be positive");

        return {
          transaction: bridge.createTransaction(account),
          updates: [
            {
              mode: "undelegate",
              memo: "LedgerLiveBot",
            },
            {
              validators: [
                {
                  address: (undelegateCandidate as CosmosDelegation)
                    .validatorAddress,
                  amount,
                },
              ],
            },
          ],
        };
      },
      test: ({ account, transaction }) => {
        const { cosmosResources } = account;
        invariant(cosmosResources, "cosmos");
        transaction.validators.forEach((v) => {
          const d = (cosmosResources as CosmosResources).unbondings.find(
            (d) => d.validatorAddress === v.address
          );
          invariant(d, "undelegated %s must be found in account", v.address);
          expect({
            address: v.address,
            amount: approximateValue(v.amount),
          }).toMatchObject({
            address: (d as CosmosUnbonding).validatorAddress,
            amount: approximateValue((d as CosmosUnbonding).amount),
          });
        });
      },
    },
    {
      name: "redelegate",
      maxRun: 1,
      transaction: ({ account, bridge }) => {
        const { cosmosResources } = account;
        invariant(cosmosResources, "cosmos");
        const sourceDelegation = sample(
          (cosmosResources as CosmosResources).delegations.filter((d) =>
            canRedelegate(account, d)
          )
        );
        invariant(sourceDelegation, "none can redelegate");
        const delegation = sample(
          (cosmosResources as CosmosResources).delegations.filter(
            (d) =>
              d.validatorAddress !==
              (sourceDelegation as CosmosDelegation).validatorAddress
          )
        );
        const amount = (sourceDelegation as CosmosDelegation).amount
          .times(
            // most of the time redelegate all
            Math.random() > 0.3 ? 1 : Math.random()
          )
          .integerValue();
        invariant(amount.gt(0), "random amount to be positive");
        return {
          transaction: bridge.createTransaction(account),
          updates: [
            {
              mode: "redelegate",
              memo: "LedgerLiveBot",
              cosmosSourceValidator: (sourceDelegation as CosmosDelegation)
                .validatorAddress,
              validators: [
                {
                  address: (delegation as CosmosDelegation).validatorAddress,
                  amount,
                },
              ],
            },
          ],
        };
      },
      test: ({ account, transaction }) => {
        const { cosmosResources } = account;
        invariant(cosmosResources, "cosmos");
        transaction.validators.forEach((v) => {
          // we possibly are moving from one existing delegation to another existing.
          // in that case it's not a redelegation, it effects immediately
          const existing = (
            cosmosResources as CosmosResources
          ).delegations.find((d) => d.validatorAddress === v.address);
          if (!existing) {
            // in other case, we will find it in a redelegation
            const d = (cosmosResources as CosmosResources).redelegations
              .slice(0) // recent first
              .sort(
                // FIXME: valueOf for date arithmetic operations in typescript
                (a, b) =>
                  b.completionDate.valueOf() - a.completionDate.valueOf()
              ) // find the related redelegation
              .find(
                (d) =>
                  d.validatorDstAddress === v.address &&
                  d.validatorSrcAddress === transaction.cosmosSourceValidator
              );
            invariant(d, "redelegated %s must be found in account", v.address);
            expect({
              address: v.address,
              amount: approximateValue(v.amount),
            }).toMatchObject({
              address: (d as CosmosRedelegation).validatorDstAddress,
              amount: approximateValue((d as CosmosRedelegation).amount),
            });
          }
        });
      },
    },
    {
      name: "claim rewards",
      maxRun: 1,
      transaction: ({ account, bridge }) => {
        const { cosmosResources } = account;
        invariant(cosmosResources, "cosmos");
        const delegation = sample(
          (cosmosResources as CosmosResources).delegations.filter((d) =>
            d.pendingRewards.gt(1000)
          )
        ) as CosmosDelegation;
        invariant(delegation, "no delegation to claim");
        return {
          transaction: bridge.createTransaction(account),
          updates: [
            {
              mode: "claimReward",
              memo: "LedgerLiveBot",
              validators: [
                {
                  address: delegation.validatorAddress,
                  amount: delegation.pendingRewards,
                },
              ],
            },
          ],
        };
      },
      test: ({ account, transaction }) => {
        const { cosmosResources } = account;
        invariant(cosmosResources, "cosmos");
        transaction.validators.forEach((v) => {
          const d = (cosmosResources as CosmosResources).delegations.find(
            (d) => d.validatorAddress === v.address
          );
          invariant(d, "delegation %s must be found in account", v.address);
          invariant(
            !canClaimRewards(account, d as CosmosDelegation),
            "reward no longer be claimable"
          );
        });
      },
    },
  ],
};
export default {
  cosmos,
};
