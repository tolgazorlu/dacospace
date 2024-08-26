import { useState } from "react";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";

const Layout = ({
  connectWallet,
  isConnected,
}: {
  connectWallet: any;
  isConnected: boolean;
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
      />
      <Sidebar isOpen={isOpen} />
    </>
  );
};

export default Layout;
