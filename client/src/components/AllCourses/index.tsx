/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */

import React from "react";
import PopularCourses from "../Landing/PopularCourses";
import CourseCategories from "../Landing/CourseCategories";
import Footer from "../Layouts/Footer";
import Layout from "../Layouts";

const AllCourses = ({
  courses,
  connectWallet,
  isConnected,
  authState,
  user,
}: any) => {
  return (
    <>
      <Layout
        connectWallet={connectWallet}
        isConnected={isConnected}
        authState={authState}
        user={user}
      />
      <PopularCourses courses={courses} />
      <CourseCategories />
      <Footer />
    </>
  );
};

export default AllCourses;
