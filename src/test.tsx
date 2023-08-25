import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useWallet, useConnection } from "@solana/wallet-adapter-react";
import { useEffect, useState } from "react";
import {
  PublicKey,
  SystemProgram,
  Transaction,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";

export default function Test() {
  const [balance, setBalance] = useState(0);
  const [addressToSend, setAddressToSend] = useState("");
  const [addressToListen, setAddressToListen] = useState("");
  const [amount, setAmount] = useState(0);
  const [txId, setTxId] = useState("");
  const [transactions, setTransactions] = useState<string[]>([]);
  const [subscriptionId, setSubscriptionId] = useState(null);
  const { publicKey, sendTransaction } = useWallet();
  const { connection } = useConnection();

  const sendSolana = async () => {
    if (!publicKey) return;
    const toPublicKey = new PublicKey(addressToSend);

    const transaction = new Transaction();
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: toPublicKey,
        lamports: LAMPORTS_PER_SOL * amount,
      })
    );

    const hash = await sendTransaction(transaction, connection);
    setTxId(hash);
  };

  useEffect(() => {
    if (!publicKey) return;

    connection.getBalance(publicKey).then((balance) => {
      setBalance(balance);
    });
  }, [publicKey, connection]);

  const ADDRESS = "api.devnet.solana.com";

  useEffect(() => {
    const ws = new WebSocket(`ws://${ADDRESS}`);

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "accountSubscribe",
          params: [
            addressToListen,
            {
              encoding: "jsonParsed",
              commitment: "finalized",
            },
          ],
        })
      );
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.id === 1 && data.result) {
        setSubscriptionId(data.result); // Storing the subscription ID
      }
      if (data.method === "accountNotification") {
        setTransactions((prevTransactions) => [
          ...prevTransactions,
          data.params,
        ]);
      }
      console.log(event.data);
    };

    return () => {
      if (subscriptionId !== null) {
        ws.send(
          JSON.stringify({
            jsonrpc: "2.0",
            id: 1,
            method: "accountUnsubscribe",
            params: [subscriptionId],
          })
        );
      }
      ws.close(); // Cleanup on unmount
    };
  }, [addressToListen]);

  return (
    <>
      <h1>Wallet Listener</h1>
      <WalletMultiButton />
      {publicKey && (
        <>
          <section>
            <h2>Send Solana</h2>
            <div>
              <p>Balance: {balance}</p>
              <input
                type="text"
                value={addressToSend}
                placeholder="Recipient Address"
                onChange={(e) => setAddressToSend(e.target.value)}
              />
              <input
                type="number"
                value={amount}
                placeholder="Amount"
                step="0.0001"
                onChange={(e) => setAmount(parseFloat(e.target.value))}
              />
              <button onClick={sendSolana}>Send</button>
            </div>
            {txId && <p>Transaction ID: {txId}</p>}
          </section>
          <section>
            <h2>Listen to Address</h2>
            <input
              type="text"
              value={addressToListen}
              placeholder="Address to Listen"
              onChange={(e) => setAddressToListen(e.target.value)}
            />
            <div>
              <h3>Transactions</h3>
              <div>
                {transactions.map((transaction, index) => (
                  <div key={index}>
                    <button onClick={() => toggleAccordion(index.toString())}>
                      Transaction {index + 1}
                    </button>
                    <div id={`accordion-${index}`} style={{ display: "none" }}>
                      <pre>{JSON.stringify(transaction, null, 2)}</pre>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      )}
    </>
  );
}

function toggleAccordion(index: string) {
  const accordion = document.getElementById(`accordion-${index}`);
  if (!accordion) return;
  accordion.style.display =
    accordion.style.display === "block" ? "none" : "block";
}
