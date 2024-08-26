import { useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { userLinks } from "./Links/user";
import { footerLinks } from "./Links/footer";

const Sidebar = (props: { isOpen: boolean }) => {
  const location = useLocation().pathname;

  const [dashboardActive, setDashboardActive] = useState(false);

  useEffect(() => {
    const dashboardRoutes = [
      "/profile",
      "/dashboard",
      "/dashboard/users",
      "/dashboard/problems",
      "/dashboard/contacts",
      "/dashboard/faqs",
    ];
    setDashboardActive(dashboardRoutes.includes(location));
  }, [location]);

  return (
    <aside
      className={
        !dashboardActive
          ? "hidden"
          : props.isOpen
            ? "overflow-scroll fixed top-0 left-0 lg:left-20 z-20 w-64 h-screen pt-20 transition-transform -translate-x-0  sm:translate-x-0 bg-base-100 shadow-md sm:shadow-none"
            : "overflow-scroll fixed top-0 left-0 lg:left-20 z-20 w-64 h-screen pt-20 transition-transform -translate-x-full  sm:translate-x-0 bg-base-100 shadow-md sm:shadow-none"
      }
    >
      <div className="h-full px-3 py-4">
        {/* USER LINKS */}

        <ul className="space-y-2 font-medium">
          {userLinks.map((item) => (
            <li key={item.path}>
              <a
                href={item.path}
                className={`flex items-center p-2 rounded ${
                  location === item.path
                    ? "bg-neutral text-neutral-content"
                    : "hover:bg-neutral/50"
                }`}
              >
                {item.icon}
                <span className="ml-3">{item.label}</span>
              </a>
            </li>
          ))}
        </ul>

        {/* BOTTOM LINKS */}

        <ul className="pt-4 mt-4 space-y-2 font-medium border-t border-base-200">
          {footerLinks.map((item) => (
            <li key={item.path}>
              <a
                href={item.path}
                className={`flex items-center p-2 rounded ${
                  location === item.path
                    ? "bg-neutral text-neutral-content"
                    : "hover:bg-neutral/50"
                }`}
              >
                {item.icon}
                <span className="ml-3">{item.label}</span>
              </a>
            </li>
          ))}
        </ul>
        <div
          id="dropdown-cta"
          className="p-4 mt-6 rounded bg-neutral font-poppins"
          role="alert"
        >
          <div className="flex items-center mb-3">
            <span className="bg-neutral-content text-neutral text-sm font-semibold mr-2 px-2.5 py-0.5 rounded">
              Beta
            </span>
          </div>
          <p className="mb-3 text-sm text-neutral-content">
            Preview the new as{" "}
            <span className="font-bold font-bandal text-xl">daco</span>, we are
            here with the beta version. If you would like to support the author,
            you can access the auhtor page.
          </p>
          <a
            className="text-sm text-neutral-content underline font-medium hover:text-neutral-content/50"
            href="daco.space/author"
            target="_blank"
          >
            Visit Author Page
          </a>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
