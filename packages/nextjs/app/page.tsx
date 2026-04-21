"use client";

import { useMemo, useState } from "react";
import type { NextPage } from "next";
import { formatEther, parseEther } from "viem";
import { useAccount, useChainId, useReadContract, useWatchContractEvent, useWriteContract } from "wagmi";
import deployedContracts from "~~/contracts/deployedContracts";
import { getParsedError } from "~~/utils/scaffold-eth/getParsedError";
import { notification } from "~~/utils/scaffold-eth/notification";

const getTipJarConfig = (chainId: number) => {
  const chainContracts = (deployedContracts as Record<number, any>)[chainId];
  const tipJar = chainContracts?.TipJar;
  return tipJar ? { address: tipJar.address as `0x${string}`, abi: tipJar.abi as any[] } : undefined;
};

const Home: NextPage = () => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const tipJar = useMemo(() => getTipJarConfig(chainId), [chainId]);
  const [tipEth, setTipEth] = useState("0.01");
  const [tipMessage, setTipMessage] = useState("");
  const [lastTxHash, setLastTxHash] = useState<string | undefined>();

  const { data: owner, refetch: refetchOwner } = useReadContract({
    address: tipJar?.address,
    abi: tipJar?.abi,
    functionName: "owner",
    query: { enabled: Boolean(tipJar?.address) },
  });

  const { data: balanceWei, refetch: refetchBalance } = useReadContract({
    address: tipJar?.address,
    abi: tipJar?.abi,
    functionName: "getBalance",
    query: { enabled: Boolean(tipJar?.address) },
  });

  useWatchContractEvent({
    chainId,
    address: tipJar?.address,
    abi: tipJar?.abi,
    eventName: "TipReceived",
    enabled: Boolean(tipJar?.address),
    onLogs: async () => {
      await refetchBalance();
    },
  });

  useWatchContractEvent({
    chainId,
    address: tipJar?.address,
    abi: tipJar?.abi,
    eventName: "TipWithdrawn",
    enabled: Boolean(tipJar?.address),
    onLogs: async () => {
      await refetchBalance();
    },
  });

  const { writeContractAsync, isPending } = useWriteContract();

  const isOwner =
    typeof owner === "string" && typeof address === "string" && owner.toLowerCase() === address.toLowerCase();

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h1 className="card-title text-2xl">TipJar</h1>
            <p className="opacity-80">컨트랙트에 팁을 보내고, 소유자(owner)는 팁을 출금할 수 있습니다.</p>

            {!tipJar && (
              <div className="alert alert-warning">
                <span>
                  현재 체인({chainId})에서 `TipJar` 배포 정보를 찾지 못했습니다. `yarn deploy`를 먼저 실행하세요.
                </span>
              </div>
            )}

            {tipJar && (
              <div className="grid grid-cols-1 gap-3">
                <div className="flex flex-col gap-1">
                  <div className="text-sm opacity-70">Contract</div>
                  <div className="font-mono text-sm break-all">{tipJar.address}</div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-sm opacity-70">Owner</div>
                  <div className="font-mono text-sm break-all">{typeof owner === "string" ? owner : "-"}</div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="text-sm opacity-70">Balance (ETH)</div>
                  <div className="font-mono text-sm break-all">
                    {typeof balanceWei === "bigint" ? formatEther(balanceWei) : "-"}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body space-y-4">
            <h2 className="card-title">팁 보내기</h2>

            <div className="form-control">
              <label className="label">
                <span className="label-text">금액 (ETH)</span>
              </label>
              <input
                className="input input-bordered font-mono"
                value={tipEth}
                onChange={e => setTipEth(e.target.value)}
                inputMode="decimal"
                placeholder="0.01"
              />
            </div>

            <div className="form-control">
              <label className="label">
                <span className="label-text">메시지</span>
              </label>
              <input
                className="input input-bordered"
                value={tipMessage}
                onChange={e => setTipMessage(e.target.value)}
                placeholder="응원 메시지를 남겨주세요"
              />
            </div>

            <button
              className="btn btn-primary"
              disabled={!isConnected || !tipJar || isPending}
              onClick={async () => {
                if (!tipJar) return;
                let value: bigint;
                try {
                  value = parseEther(tipEth || "0");
                } catch (e) {
                  notification.error(getParsedError(e));
                  return;
                }

                if (value <= 0n) {
                  notification.error("0보다 큰 금액을 입력하세요.");
                  return;
                }

                const toastId = notification.loading("지갑에서 트랜잭션을 확인하세요...");
                try {
                  const txHash = await writeContractAsync({
                    chainId,
                    address: tipJar.address,
                    abi: tipJar.abi,
                    functionName: "tip",
                    args: [tipMessage],
                    value,
                  });
                  setLastTxHash(String(txHash));
                  notification.remove(toastId);
                  notification.success(
                    <div className="space-y-1">
                      <div>팁 전송 트랜잭션 제출됨</div>
                      <div className="font-mono text-xs break-all">{String(txHash)}</div>
                    </div>,
                  );
                  await refetchBalance();
                  setTipMessage("");
                } catch (e) {
                  notification.remove(toastId);
                  notification.error(getParsedError(e));
                }
              }}
            >
              {isPending ? "전송 중..." : "팁 전송"}
            </button>
            {!isConnected && <div className="text-sm opacity-70">지갑을 연결하세요.</div>}
          </div>
        </div>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body space-y-3">
            <h2 className="card-title">출금 (owner 전용)</h2>
            <button
              className="btn btn-secondary"
              disabled={!isConnected || !tipJar || !isOwner || isPending}
              onClick={async () => {
                if (!tipJar) return;
                const toastId = notification.loading("지갑에서 트랜잭션을 확인하세요...");
                try {
                  const txHash = await writeContractAsync({
                    chainId,
                    address: tipJar.address,
                    abi: tipJar.abi,
                    functionName: "withdrawTips",
                    args: [],
                  });
                  setLastTxHash(String(txHash));
                  notification.remove(toastId);
                  notification.success(
                    <div className="space-y-1">
                      <div>출금 트랜잭션 제출됨</div>
                      <div className="font-mono text-xs break-all">{String(txHash)}</div>
                    </div>,
                  );
                  await Promise.all([refetchBalance(), refetchOwner()]);
                } catch (e) {
                  notification.remove(toastId);
                  notification.error(getParsedError(e));
                }
              }}
            >
              {isPending ? "처리 중..." : "출금"}
            </button>
            {isConnected && tipJar && !isOwner && (
              <div className="text-sm opacity-70">현재 연결된 주소는 owner가 아니어서 출금할 수 없습니다.</div>
            )}
          </div>
        </div>

        {lastTxHash && (
          <div className="alert">
            <span className="font-mono text-xs break-all">Last tx: {lastTxHash}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
