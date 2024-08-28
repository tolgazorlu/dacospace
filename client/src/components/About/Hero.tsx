const Hero = () => {
  return (
    <>
      {/* Hero */}
      <div className="px-4 lg:px-24 py-8 mx-auto sm:pt-16 mt-20 lg:mt-0">
        <h1 className="font-semibold text-gray-200 text-5xl md:text-5xl font-bandal">
          <span className="text-[#435bff]">Daily Contents:</span>{" "}
          <span>Elevate Your Learning Experience!</span>
        </h1>
        <div className="max-w-7xl">
          <p className="mt-5 text-neutral-400 text-xl font-poppins">
            Unlock your full potential with our unique daily content feature,
            designed to keep you engaged and motivated every step of the way.
            Our platform, powered by the innovative{" "}
            <span className="text-accent">EduChain</span> and{" "}
            <span className="text-[#435bff]">Open Campus</span>, allows you to
            purchase courses using EDU tokens. Once enrolled, you’ll gain access
            to daily lessons that guide you through your learning journey in a
            structured and manageable way. Whether you're mastering a new skill
            or diving deeper into a subject you're passionate about, our daily
            content ensures steady progress and continuous growth.
          </p>
        </div>
      </div>
      {/* End Hero */}
    </>
  );
};

export default Hero;
