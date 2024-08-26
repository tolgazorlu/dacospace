/* eslint-disable @typescript-eslint/no-explicit-any */
import { ToastContainer } from "react-toastify";
import Layout from "../Layouts";
import Footer from "../Layouts/Footer";
import Hero from "./Banner";

import CourseCategories from "./CourseCategories";

const Landing = ({
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
      <Hero connectWallet={connectWallet} user={user} />
      {/* <PopularCourses courses={courses} item={item} setItem={setItem} /> */}
      <CourseCategories />
      <Footer />
    </>
  );
};

export default Landing;
