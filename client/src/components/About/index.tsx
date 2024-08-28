/* eslint-disable @typescript-eslint/no-explicit-any */
import Layout from "../Layouts";
import Footer from "../Layouts/Footer";
import Hero from "./Hero";
import ParallaxPage from "./ParallaxPage";
import Testimotion from "./Testimotion";
import Vision from "./Vision";
const About = ({
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
  return (
    <>
      <Layout
        connectWallet={connectWallet}
        isConnected={isConnected}
        authState={authState}
        user={user}
      />
      <div className="hidden lg:block">
        <ParallaxPage />
      </div>
      <div className="block lg:hidden">
        <Hero />
        <Vision />
        <Testimotion />
        <Footer />
      </div>
    </>
  );
};

export default About;
