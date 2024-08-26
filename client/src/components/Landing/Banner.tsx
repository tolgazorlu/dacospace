/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/rules-of-hooks */
import { useOCAuth } from "@opencampus/ocid-connect-js";
import Calendar from "./Calendar";

const index = ({ connectWallet, user }: { connectWallet: any; user: any }) => {
  const { ocAuth } = useOCAuth();
  const handleLogin = async () => {
    await ocAuth.signInWithRedirect({
      state: "opencampus",
    });
  };
  return (
    <>
      <section className="lg:grid grid-cols-2 px-4 lg:px-24 overflow-hidden">
        <div className="h-screen md:snap-start flex flex-col justify-center">
          <a
            href="https://discord.gg/VWz8eYjtf3"
            className="bg-neutral text-neutral-content inline-flex justify-between items-center py-1 px-1 pr-4 mb-7 text-sm rounded-xl md:w-1/2 lg:w-2/3"
            role="alert"
          >
            <span className="text-xs bg-neutral text-neutral-content rounded-lg px-4 py-1.5 mr-3 border">
              Discord
            </span>{" "}
            <span className="text-sm font-medium">Let's join the server!</span>
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

          <span className="text-6xl lg:text-8xl font-extrabold tracking-tight leading-none  font-bandal">
            dacospace
          </span>
          <h1 className="font-title font-bandal text-[clamp(2rem,6vw,4.2rem)] font-black leading-[1.1] [word-break:auto-phrase] xl:w-[115%] xl:text-start [:root[dir=rtl]_&amp;]:leading-[1.35]">
            <span className="inline-grid">
              <span
                className="text-3xl font-extrabold tracking-tight leading-none md:text-5xl lg:text-5xl font-poppins pointer-events-none col-start-1 row-start-1 bg-[linear-gradient(90deg,theme(colors.error)_0%,theme(colors.secondary)_9%,theme(colors.secondary)_42%,theme(colors.success)_47%,theme(colors.accent)_100%)] bg-clip-text blur-xl [-webkit-text-fill-color:transparent] [transform:translate3d(0,0,0)] before:content-[attr(data-text)] [@supports(color:oklch(0_0_0))]:bg-[linear-gradient(90deg,oklch(var(--s))_4%,color-mix(in_oklch,oklch(var(--s)),oklch(var(--er)))_22%,oklch(var(--p))_45%,color-mix(in_oklch,oklch(var(--p)),oklch(var(--a)))_67%,oklch(var(--a))_100.2%)]"
                aria-hidden="true"
                data-text="Don't Break The Chain!"
              ></span>
              <span className="mb-4 text-3xl font-extrabold tracking-tight leading-none md:text-5xl lg:text-5xl font-poppins [&amp;::selection]:text-base-content relative col-start-1 row-start-1 bg-[linear-gradient(90deg,theme(colors.error)_0%,theme(colors.secondary)_9%,theme(colors.secondary)_42%,theme(colors.success)_47%,theme(colors.accent)_100%)] bg-clip-text [-webkit-text-fill-color:transparent] [&amp;::selection]:bg-blue-700/20 [@supports(color:oklch(0_0_0))]:bg-[linear-gradient(90deg,oklch(var(--s))_4%,color-mix(in_oklch,oklch(var(--s)),oklch(var(--er)))_22%,oklch(var(--p))_45%,color-mix(in_oklch,oklch(var(--p)),oklch(var(--a)))_67%,oklch(var(--a))_100.2%)]">
                Don't Break The Chain!
              </span>
            </span>
          </h1>
          <p className="mb-8 text-lg font-normal lg:text-xl font-poppins">
            Discover daily contents at{" "}
            <span className="font-bandal font-bold text-3xl">dacospace</span>,
            where new content are added every day across various subjects.
          </p>
          {user ? (
            <div className="flex flex-col mt-8 mb-8 lg:mb-16 space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
              <button className="font-poppins inline-flex justify-center items-center py-3 px-5 font-medium text-center rounded bg-primary text-primary-content">
                Start Here
              </button>
              <button className="font-poppins inline-flex justify-center items-center py-3 px-5 font-medium text-center rounded bg-primary-content text-primary shadow">
                Learn More
              </button>
            </div>
          ) : (
            <div className="flex flex-col mt-8 mb-8 lg:mb-16 space-y-4 sm:flex-row sm:space-y-0 sm:space-x-4">
              <button
                onClick={handleLogin}
                className="font-poppins inline-flex justify-center items-center py-3 px-5 font-medium text-center rounded bg-accent-content text-accent"
              >
                <img
                  src="https://cryptologos.cc/logos/open-campus-edu-logo.svg?v=033"
                  className="w-8"
                />
                <span className="ml-2"> Connect OCID</span>
              </button>
              <button
                onClick={connectWallet}
                className="font-poppins inline-flex justify-center items-center py-3 px-5 font-medium text-center rounded bg-warning-content text-warning shadow"
              >
                {" "}
                <img
                  className="w-8"
                  src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/36/MetaMask_Fox.svg/1024px-MetaMask_Fox.svg.png"
                />
                <span className="ml-2"> Connect Metamask </span>
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
