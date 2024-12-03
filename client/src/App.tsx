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
import AllCourses from "./components/AllCourses";
import CourseContent from "./components/CourseContent";
import Content from "./components/Content";

function App() {
  const { authState, ocAuth } = useOCAuth();
  const [user, setUser] = useState();
  const [contracts, setContracts] = useState(null);
  const [courses, setCourses] = useState([]);

  useEffect(() => {
    // Check if user is logged in with OCID
    if (authState.idToken) {
      setUser(ocAuth.getAuthInfo());
    }

    (async () => {
      try {
        const web3 = new Web3(window.ethereum);
        await web3.eth.getChainId();
        const contractAddress = "0x3AfEEEe5b8974072cf14c34189dEc22b4aC1e2ab";

        const Dacospace = new web3.eth.Contract(
          contractJson.abi,
          contractAddress
        ) as Contracts;
        setContracts(Dacospace);
        Dacospace.setProvider(window.ethereum);
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
    console.log("success");
    setTimeout(() => {
      window.location.href = "/"; // Redirect to the homepage after 1 second
    }, 2000); // 1000 milliseconds = 1 second
  };

  const onLoginError = () => {
    console.log("Error");
    setTimeout(() => {
      window.location.href = "/"; // Redirect to the homepage after 1 second
    }, 2000); // 1000 milliseconds = 1 second
  };

  async function addNewCourse(courseDetails) {
    if (window.ethereum) {
      const web3 = new Web3(window.ethereum);
      try {
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const accounts = await web3.eth.getAccounts();
        // const contract = new web3.eth.Contract(
        //   contractJson.abi,
        //   "0xfac1951650E27CD38DBBabdd5cE828ab5e4b22c9"
        // );

        //Call the addCourse function
        const res = await contracts.methods
          .list(
            courseDetails.id,
            courseDetails.title,
            courseDetails.slug,
            courseDetails.description,
            courseDetails.image,
            courseDetails.category,
            courseDetails.cost,
            courseDetails.rating,
            courseDetails.sold
          )
          .send({ from: accounts[0] });

        setTimeout(fetchCourse, 5000); // Wait 5 seconds before fetching courses

        console.log(res);
        // console.log(
        //   "Method: ",
        //   await contract.methods.getAllCourses().call(null, "latest")
        // );
        // fetchCourse();
      } catch (error) {
        console.error("Error adding course:", error);
      }
    } else {
      console.error("MetaMask is not installed");
    }
  }

  const fetchCourse = async () => {
    if (contracts) {
      try {
        const fetchedCourses = [];
        for (let i = 1; i <= 4; i++) {
          const course = await contracts.methods.courses(i).call();
          fetchedCourses.push(course);
        }
        setCourses(fetchedCourses);
        console.log(courses);
        console.log("Course: ", courses);
      } catch (error) {
        console.error("Error fetching course:", error);
      }
    }
  };

  useEffect(() => {
    if (contracts) {
      fetchCourse();
    }
  }, [contracts]);

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
              addNewCourse={addNewCourse}
              courses={courses}
            />
          }
        />
        <Route
          path="/about"
          element={
            <About
              connectWallet={ConnectWallet}
              authState={authState}
              user={user}
            />
          }
        />
        <Route
          path="/courses"
          element={
            <AllCourses courses={courses} contracts={contracts} user={user} />
          }
        />
        <Route
          path="/redirect"
          element={
            <LoginCallBack
              successCallback={onLoginSuccess}
              errorCallback={onLoginError}
            />
          }
        />
        <Route
          path="/course/lessons/:slug"
          element={
            <CourseContent
              connectWallet={ConnectWallet}
              authState={authState}
              user={user}
            />
          }
        />
        <Route
          path="/day/content/:slug"
          element={
            <Content
              connectWallet={ConnectWallet}
              authState={authState}
              user={user}
            />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
