const Hero = () => {
  return (
    <>
      {/* Hero */}
      <div className="px-4 lg:px-24 py-8 mx-auto sm:py-16 lg:py-24">
        <h1 className="font-semibold text-gray-200 text-5xl md:text-5xl font-bandal">
          <span className="text-accent">Daily Contents:</span>{" "}
          <span>Improve your skills!</span>
        </h1>
        <div className="max-w-7xl">
          <p className="mt-5 text-neutral-400 text-xl font-poppins">
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
            eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim
            ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut
            aliquip ex ea commodo consequat. Duis aute irure dolor in
            reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla
            pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
            culpa qui officia deserunt mollit anim id est laborum."
          </p>
        </div>
      </div>
      {/* End Hero */}
    </>
  );
};

export default Hero;
