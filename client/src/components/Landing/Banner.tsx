/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */
import { useOCAuth } from "@opencampus/ocid-connect-js";
import Calendar from "./Calendar";

const index = ({
  user,
  addNewCourse,
}: {
  connectWallet: any;
  user: any;
  addNewCourse: any;
}) => {
  const { ocAuth } = useOCAuth();
  const handleLogin = async () => {
    await ocAuth.signInWithRedirect({
      state: "opencampus",
    });
  };

  // Example usage
  const newCourse = {
    id: 4,
    title: "Data Science Essentials",
    slug: "data-science-essentials",
    description:
      "An introductory course to data science, including data analysis and machine learning basics.",
    image: "https://i.hizliresim.com/pxgajy0.png",
    category: "Data Science",
    cost: 4, // in wei
    rating: 4,
    sold: 200,
  };

  return (
    <>
      <section className="lg:grid grid-cols-2 px-4 lg:px-24 overflow-hidden">
        <div className="h-screen md:snap-start flex flex-col justify-center">
          <a
            href="https://discord.gg/VWz8eYjtf3"
            className="border border-primary text-primary inline-flex justify-between items-center py-1 px-1 pr-4 mb-7 text-sm rounded-xl md:w-1/2 lg:w-2/3"
            role="alert"
          >
            <span className="text-xs bg-primary text-primary-content rounded-lg px-4 py-1.5 mr-3 ">
              Discord
            </span>{" "}
            <span className="text-sm font-medium text-primary">
              Let's join the server!
            </span>
            <svg
              className="ml-2 w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                clipRule="evenodd"
              ></path>
            </svg>
          </a>

          <span className="text-6xl lg:text-8xl font-extrabold tracking-tight leading-none font-bandal text-primary">
            dacospace
          </span>
          <span className="mb-4 text-3xl font-extrabold tracking-tight leading-none md:text-5xl lg:text-5xl font-poppins text-base-content">
            Don't Break <span className="underline">The Chain!</span>
          </span>
          <p className="mb-8 text-lg font-normal lg:text-xl font-poppins">
            Discover daily contents at{" "}
            <span className="font-bandal font-bold text-3xl">dacospace</span>,
            where new content are added every day across various subjects.
          </p>
          {user ? (
            <div className="flex flex-col mt-8 mb-8 lg:mb-16 space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
              <button
                onClick={() => {
                  addNewCourse(newCourse);
                }}
                className="btn btn-lg btn-primary"
              >
                Start Here
              </button>
              <button className="btn btn-lg bg-base-content text-base-300 hover:text-base-content">
                Learn More
              </button>
            </div>
          ) : (
            <div className="flex flex-col mt-8 mb-8 lg:mb-16 space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
              <button onClick={handleLogin} className="btn btn-lg btn-primary">
                <img
                  src="https://cryptologos.cc/logos/open-campus-edu-logo.svg?v=033"
                  className="w-8"
                />
                <span className="ml-2"> Connect OCID</span>
              </button>
              <button className="btn btn-lg bg-base-content text-base-300 hover:text-base-content">
                Learn More About Open Campus
              </button>
            </div>
          )}
        </div>
        <Calendar />
      </section>
    </>
  );
};

export default index;
