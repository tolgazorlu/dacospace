/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */

import Layout from "../Layouts";
import Counter from "./Counter";

const CourseContent = ({
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
      <section className="h-screen flex flex-col justify-between ">
        <div className="mt-20 flex flex-col gap-4 p-4 px-4 lg:px-24 h-5/6 overflow-scroll">
          <div className="flex flex-col gap-3">
            <div className="text-2xl flex flex-col gap-4">
              <ul className="flex flex-col">
                <div className="flex flex-col">
                  <div className="text-center px-6 p-2 rounded bg-base-300 text-primary border-2 border-neutral mb-4 font-aubette">
                    1. DAY
                  </div>
                </div>
                <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <li>
                    <a
                      href={"/question/"}
                      className="max-w-lg p-6 rounded hover:bg-neutral hover:text-neutral-content bg-primary text-accent shadow-lg flex flex-col gap-2"
                    >
                      <span className="text-xl font-bold font-poppins">
                        Introduction the course
                      </span>
                    </a>
                  </li>
                  <li>
                    <a
                      href={"/question/"}
                      className="max-w-lg p-6 rounded hover:bg-neutral hover:text-neutral-content bg-primary text-accent shadow-lg flex flex-col gap-2"
                    >
                      <span className="text-xl font-bold font-poppins">
                        How to join our community?
                      </span>
                    </a>
                  </li>
                  <li>
                    <a
                      href={"/question/"}
                      className="max-w-lg p-6 rounded hover:bg-neutral hover:text-neutral-content bg-primary text-accent shadow-lg flex flex-col gap-2"
                    >
                      <span className="text-xl font-bold font-poppins">
                        Lesson 1: What is Blockchain?
                      </span>
                    </a>
                  </li>
                </ul>
              </ul>
              <ul className="flex flex-col">
                <div className="flex flex-col">
                  <span className="text-center px-6 p-2 rounded bg-base-300 text-primary border-2 border-neutral mb-4 font-aubette">
                    2. DAY
                  </span>
                </div>
                <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <li>
                    <a
                      href={"/question/"}
                      className="max-w-lg p-6 rounded hover:bg-neutral hover:text-neutral-content bg-primary text-accent shadow-lg flex flex-col gap-2"
                    >
                      <span className="text-xl font-bold font-poppins">
                        Data Structure and Algorithms
                      </span>
                    </a>
                  </li>
                </ul>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-center items-center bg-base-300 w-full h-1/6 overflow-hidden">
          <Counter />
          <span className="font-bandal hidden lg:flex text-2xl text-secondary font-bold">
            left
          </span>
        </div>
      </section>
    </>
  );
};

export default CourseContent;
