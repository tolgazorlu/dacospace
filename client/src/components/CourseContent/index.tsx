import Counter from "./Counter";

const CourseContent = ({ item }: any) => {
  console.log("item", item);
  return (
    <>
      <section className="h-screen flex flex-col justify-between ">
        <div className="mt-20 flex flex-col gap-4 p-4 px-4 lg:px-24 h-5/6 overflow-scroll">
          <div className="flex flex-col gap-3">
            <div className="text-2xl flex flex-col gap-4">
              <ul className="flex flex-col">
                <div className="flex flex-col">
                  <span className="text-center px-6 p-2 rounded bg-primary text-primary-content mb-4 font-aubette">
                    1. DAY
                  </span>
                </div>
                <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <li>
                    <a
                      href={"/question/"}
                      className="max-w-lg p-6 rounded hover:bg-base-300 hover:text-base-content bg-success text-success-content shadow-lg flex flex-col gap-2"
                    >
                      <span className="text-xl font-bold font-poppins">
                        Introduction to Python
                      </span>
                    </a>
                  </li>
                </ul>
              </ul>
              <ul className="flex flex-col">
                <div className="flex flex-col">
                  <span className="text-center px-6 p-2 rounded bg-primary-content text-primary mb-4 font-aubette">
                    2. DAY
                  </span>
                </div>
                <ul className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <li>
                    <a
                      href={"/question/"}
                      className="max-w-lg p-6 rounded hover:bg-base-300 hover:text-base-content bg-success text-success-content shadow-lg flex flex-col gap-2"
                    >
                      <span className="text-xl font-bold font-poppins">
                        Variables and data types
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
          <span className="font-bandal hidden lg:flex text-2xl text-accent font-bold">
            left
          </span>
        </div>
      </section>
    </>
  );
};

export default CourseContent;
