const Vision = () => {
  return (
    <>
      {/* Icon Blocks */}
      <div className="px-4 mx-auto lg:px-24 py-10 font-poppins">
        {/* Grid */}
        <div className="grid md:grid-cols-2 gap-12">
          <div className="lg:w-3/4">
            <h2 className="text-3xl text-gray-200 font-bold lg:text-3xl">
              Empowering Learning with Blockchain Technology
            </h2>
            <p className="mt-3 text-gray-400">
              We empower individuals to expand their knowledge and skills in the
              digital world by offering courses powered by blockchain
              technology. Our platform ensures secure, transparent transactions,
              giving you access to the tools you need to succeed.
              <br />
              <br />
              We provide a seamless and innovative learning experience, allowing
              you to purchase and access courses using EDU tokens on the
              EduChain. Join us in transforming education for the digital age.
            </p>
            <p className="mt-5">
              <a
                className="inline-flex items-center gap-x-1 font-medium text-[#435bff]"
                href="#"
              >
                Explore courses to start learning more ➜
                <svg
                  className="flex-shrink-0 size-4 transition ease-in-out group-hover:translate-x-1"
                  xmlns="http://www.w3.org/2000/svg"
                  width={24}
                  height={24}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </a>
            </p>
          </div>
          {/* End Col */}
          <div className="space-y-6 lg:space-y-10">
            {/* Icon Block */}
            <div className="flex">
              {/* Icon */}
              <span className="flex-shrink-0 inline-flex justify-center items-center size-[46px] rounded-full  text-gray-300 shadow-sm mx-auto">
                <svg
                  className="flex-shrink-0 size-5"
                  xmlns="http://www.w3.org/2000/svg"
                  width={24}
                  height={24}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
              </span>
              <div className="ms-5 sm:ms-8">
                <h3 className="text-base sm:text-lg font-semibold text-gray-300">
                  Industry-leading Education Platform
                </h3>
                <p className="mt-1 text-gray-500">
                  Our platform leverages cutting-edge blockchain technology,
                  ensuring secure and transparent transactions. With our
                  extensive resources and seamless integration, you can quickly
                  start your learning journey, backed by the reliability of the
                  EduChain powered by OpenCampus.
                </p>
              </div>
            </div>
            {/* End Icon Block */}
            {/* Icon Block */}
            <div className="flex">
              {/* Icon */}
              <span className="flex-shrink-0 inline-flex justify-center items-center size-[46px] rounded-full  text-gray-300 shadow-sm mx-auto">
                <svg
                  className="flex-shrink-0 size-5"
                  xmlns="http://www.w3.org/2000/svg"
                  width={24}
                  height={24}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2v5Z" />
                  <path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" />
                </svg>
              </span>
              <div className="ms-5 sm:ms-8">
                <h3 className="text-base sm:text-lg font-semibold text-gray-300">
                  Community-driven Growth
                </h3>
                <p className="mt-1 text-gray-500">
                  We believe in the power of collaboration. Our community of
                  learners and educators drives continuous improvement, sharing
                  knowledge and experiences that enrich the entire platform.
                  Join a thriving network where your success fuels the
                  collective growth.
                </p>
              </div>
            </div>
            {/* End Icon Block */}
            {/* Icon Block */}
            <div className="flex">
              {/* Icon */}
              <span className="flex-shrink-0 inline-flex justify-center items-center size-[46px] rounded-full  text-gray-300 shadow-sm mx-auto">
                <svg
                  className="flex-shrink-0 size-5"
                  xmlns="http://www.w3.org/2000/svg"
                  width={24}
                  height={24}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M7 10v12" />
                  <path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
                </svg>
              </span>
              <div className="ms-5 sm:ms-8">
                <h3 className="text-base sm:text-lg font-semibold text-gray-300">
                  Accessible and Affordable Learning
                </h3>
                <p className="mt-1 text-gray-500">
                  Education should be accessible to everyone. Our platform
                  offers a variety of courses at affordable prices, enabling you
                  to learn and grow without breaking the bank. Invest in your
                  future with courses that are priced right, with daily content
                  that keeps you engaged and on track.
                </p>
              </div>
            </div>
            {/* End Icon Block */}
          </div>
          {/* End Col */}
        </div>
        {/* End Grid */}
      </div>
      {/* End Icon Blocks */}
    </>
  );
};

export default Vision;
