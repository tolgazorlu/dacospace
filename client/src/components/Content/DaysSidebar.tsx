/* eslint-disable @typescript-eslint/no-explicit-any */
const days = [
  {
    day: 1,
    title: "DAY 1",
    lessons: [
      "Introduction the course",
      "How to join our community?",
      "What is Blockchain?",
    ],
  },
  { day: 2, title: "DAY 2", lessons: ["Data types and algorithms"] },
];

const DaysSidebar = () => {
  return (
    <ul className="hidden col-span-1 md:flex gap-2 flex-col">
      {days.map((item: any, index: number) => (
        <li key={index} className="collapse collapse-arrow bg-base-200 rounded">
          <input type="radio" name="my-accordion-3" defaultChecked />
          <span className="collapse-title text-xl font-bold font-aubette">
            {item.title}
          </span>
          <ul className="collapse-content flex flex-col gap-2">
            {item?.lessons?.map((title: string) => (
              <li className="flex flex-col">
                <a className="bg-primary rounded p-2 btn border-0 justify-start">
                  <span className="ml-2 text-primary-content">{title}</span>
                </a>
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ul>
  );
};

export default DaysSidebar;
