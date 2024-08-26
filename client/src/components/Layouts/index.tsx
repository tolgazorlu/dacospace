/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

const Layout = ({
  connectWallet,
  isConnected,
  authState,
  user,
}: {
  connectWallet: any;
  isConnected: boolean;
  authState: any;
  user: any;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const setIsOpenSidebar = (state: boolean) => {
    setIsOpen(state);
  };

  return (
    <>
      <Navbar
        setIsOpenSidebar={setIsOpenSidebar}
        connectWallet={connectWallet} // Ensure setAccount is passed correctly
        isConnected={isConnected}
        authState={authState}
        user={user}
      />
      <Sidebar isOpen={isOpen} />
    </>
  );
};

export default Layout;
