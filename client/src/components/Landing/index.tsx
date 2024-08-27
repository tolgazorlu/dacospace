/* eslint-disable @typescript-eslint/no-explicit-any */
import { ToastContainer } from "react-toastify";
import Layout from "../Layouts";
import Footer from "../Layouts/Footer";
import Hero from "./Banner";

import CourseCategories from "./CourseCategories";
import PopularCourses from "./PopularCourses";

const Landing = ({
  connectWallet,
  isConnected,
  authState,
  user,
  addNewCourse,
  courses,
}: {
  connectWallet: any;
  isConnected: boolean;
  authState: any;
  user: any;
  addNewCourse: any;
  courses: any;
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
      <PopularCourses courses={courses} />
      <CourseCategories />
      <Footer />
    </>
  );
};

export default Landing;
