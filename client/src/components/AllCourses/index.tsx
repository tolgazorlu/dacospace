/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */

import React, { useEffect, useState } from "react";
import CourseCategories from "../Landing/CourseCategories";
import Footer from "../Layouts/Footer";
import Layout from "../Layouts";
import PopularCourses from "./PopularCourses";

const AllCourses = ({
  courses,
  connectWallet,
  isConnected,
  authState,
  user,
  contracts,
}: any) => {
  const [listCoursesArray, setListCoursesArray] = useState(null);

  useEffect(() => {
    if (courses && courses.length == 0) {
      setListCoursesArray(courses);
    } else {
      setListCoursesArray(null);
    }
  }, [courses]);

  return (
    <>
      <Layout
        connectWallet={connectWallet}
        isConnected={isConnected}
        authState={authState}
        user={user}
      />
      {listCoursesArray == null ? (
        <>
          <PopularCourses courses={courses} contracts={contracts} user={user} />
        </>
      ) : (
        <div className="px-4 lg:px-24 py-10 mt-14 flex justify-center items-center h-96 bg-base-300">
          <button className="btn btn-lg btn-primary">
            Please install Metamask to view courses.
          </button>
        </div>
      )}
      <CourseCategories />
      <Footer />
    </>
  );
};

export default AllCourses;
