/* eslint-disable @typescript-eslint/no-explicit-any */
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkToc from "remark-toc";
import rehypeRaw from "rehype-raw";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/a11y-dark.css";
import Layout from "../Layouts";

import data from "./content.json";
import DaysSidebar from "./DaysSidebar";

const Content = ({ connectWallet, isConnected, authState, user }: any) => {
  return (
    <>
      <Layout
        connectWallet={connectWallet}
        isConnected={isConnected}
        authState={authState}
        user={user}
      />
      <div className="py-10 grid grid-cols-3 px-4 lg:px-24 gap-4 mt-20 md:p-10">
        {/** MARKDOWN SECTION */}

        <div className="prose lg:prose-lg col-span-2">
          <Markdown
            remarkPlugins={[remarkGfm, remarkToc]}
            rehypePlugins={[rehypeHighlight, rehypeRaw]}
            children={data.markdownContent}
          />
        </div>

        <DaysSidebar />

        {/** FOOTER */}

        <section className="flex justify-between items-center fixed right-0 left-0 bottom-0 w-full px-4 lg:px-24 bg-primary py-8">
          <div className="flex flex-col">
            <span className="text-xl md:text-3xl font-bandal text-primary-content">
              Introduction the Course
            </span>
            <span className="text-sm md:text-lg font-bandal text-primary-content">
              Learn the basics of blockchain technology and its applications.
            </span>
          </div>

          <form className="flex flex-col md:flex-row gap-4">
            <button className="btn btn-primary-content w-full md:w-32 rounded text-primary">
              Next Lesson
            </button>
          </form>
        </section>
      </div>
    </>
  );
};

export default Content;
