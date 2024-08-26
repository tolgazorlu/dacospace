/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-ignore
// @ts-nocheck

import { BrowserRouter, Route, Routes } from "react-router-dom";
import Landing from "./components/Landing";
import About from "./components/About";
import { useState, useEffect } from "react";
import Web3 from "web3";
import contractJson from "./contracts/Dacospace.sol/Dacospace.json";
import { LoginCallBack } from "@opencampus/ocid-connect-js";

import { useOCAuth } from "@opencampus/ocid-connect-js";

function App() {
  const { authState, ocAuth } = useOCAuth();
  const [user, setUser] = useState();

  useEffect(() => {
    // Check if user is logged in with OCID
    if (authState.idToken) {
      setUser(ocAuth.getAuthInfo());
    }

    (async () => {
      try {
        if (typeof window.ethereum !== "undefined") {
          const web3 = new Web3(window.ethereum);
          setWeb3(web3);
          const networkId: any = await web3.eth.getChainId();
          setGetNetwork(networkId);
          const contractAddress = "0x48D2d71e26931a68A496F66d83Ca2f209eA9956E";
          setContractAddress(contractAddress);
          const Dacospace = new web3.eth.Contract(
            contractJson.abi,
            contractAddress
          ) as Contracts;
          setContracts(Dacospace);
          Dacospace.setProvider(window.ethereum);
        } else {
          alert("Please install MetaMask!");
        }
      } catch (error) {
        console.error("Failed to initialize web3 or contract:", error);
      }
    })();
  }, [authState.idToken]);

  const ConnectWallet = async () => {
    // Connect to MetaMask and handle errors
    if (typeof window.ethereum !== "undefined") {
      try {
        const chainId = await window.ethereum.request({
          method: "eth_chainId",
        });
        if (chainId !== "0xa045c") {
          alert(
            `Please connect to the "Open Campus Codex" network in Metamask.`
          );
          return;
        }
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const accounts = await window.ethereum.request({
          method: "eth_accounts",
        });
        setAccountAddress(accounts[0]);
        setMmStatus("Connected!");
        setIsConnected(true);
      } catch (error) {
        console.error("Failed to connect to wallet:", error);
      }
    } else {
      alert("Please install MetaMask!");
    }
  };

  // const receive = async () => {
  //   // Fetch message from the blockchain
  //   if (contracts) {
  //     try {
  //       const displayMessage = await contracts.methods.read().call();
  //       setDisplayMessage(displayMessage);
  //     } catch (error) {
  //       console.error("Failed to read from contract:", error);
  //     }
  //   }
  // };

  // const send = async () => {
  //   // Send message to the blockchain
  //   const getMessage = (document.getElementById("message") as HTMLInputElement)
  //     .value;
  //   if (!getMessage.trim()) {
  //     alert("Message cannot be empty.");
  //     return;
  //   }
  //   setLoading(true);
  //   setShowMessage(true);
  //   if (contracts && accountAddress) {
  //     try {
  //       await contracts.methods
  //         .write(getMessage)
  //         .send({ from: accountAddress })
  //         .on("transactionHash", (hash: string) => {
  //           setTxnHash(hash);
  //         });
  //       // Auto-refresh message after sending
  //       await receive();
  //     } catch (error) {
  //       console.error("Failed to write to contract:", error);
  //     }
  //   }
  //   setLoading(false);
  //   setTimeout(() => {
  //     setShowMessage(false);
  //   }, 3000);
  // };

  const onLoginSuccess = () => {
    navigate("/");
  };

  const onLoginError = () => {
    console.log("Error");
  };

  const OCLoginCallback = () => (
    <LoginCallBack
      errorCallback={onLoginError}
      successCallback={onLoginSuccess}
    />
  );

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Landing
              connectWallet={ConnectWallet}
              authState={authState}
              user={user}
            />
          }
        />
        <Route path="/about" element={<About />} />
        <Route path="/redirect" element={<OCLoginCallback />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
