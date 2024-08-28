/* eslint-disable @typescript-eslint/no-explicit-any */
import { ToastContainer } from "react-toastify";
import Layout from "../Layouts";
import Hero from "./Banner";

const Landing = ({
  connectWallet,
  isConnected,
  authState,
  user,
  addNewCourse,
}: {
  connectWallet: any;
  isConnected: boolean;
  authState: any;
  user: any;
  addNewCourse: any;
}) => {
  return (
    <>
      <ToastContainer
        position="bottom-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        stacked
      />
      <Layout
        connectWallet={connectWallet}
        isConnected={isConnected}
        authState={authState}
        user={user}
      />
      <Hero
        connectWallet={connectWallet}
        user={user}
        addNewCourse={addNewCourse}
      />
    </>
  );
};

export default Landing;
