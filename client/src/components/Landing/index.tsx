import { ToastContainer } from "react-toastify";
import Layout from "../Layouts";
import Footer from "../Layouts/Footer";
import Hero from "./Banner";

import CourseCategories from "./CourseCategories";

const Landing = ({
  connectWallet,
  isConnected,
}: {
  connectWallet: any;
  isConnected: boolean;
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
      <Layout connectWallet={connectWallet} isConnected={isConnected} />
      <Hero />
      {/* <PopularCourses courses={courses} item={item} setItem={setItem} /> */}
      <CourseCategories />
      <Footer />
    </>
  );
};

export default Landing;
