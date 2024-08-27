import { useNavigate } from "react-router-dom";

const PopularCourses = ({ courses }: any) => {
  const navigate = useNavigate();
  return (
    <div className="px-4 lg:px-24 py-10">
      {/* Title */}
      <h1 className="text-2xl font-semibold mb-4">Popular Courses</h1>
      {/* End Title */}
      {/* Grid */}
      <div className="grid sm:grid-cols-4 gap-4">
        {/* Card */}
        {courses.map((course: any, index: number) => (
          <div className="card card-compact bg-base-100 shadow-xl " key={index}>
            <figure>
              <img
                src={course.image}
                alt={course.title}
                className="w-full bg-primary-content object-contain"
              />
            </figure>
            <div className="card-body">
              <h2 className="card-title">{course.title}</h2>
              <p>{course.description}</p>
              <div className="card-actions justify-end">
                <button
                  className="btn btn-warning text-accent-content"
                  onClick={() => {
                    // setItem(course);
                    navigate(`/course/${course.title.slice(0, 5)}`);
                  }}
                >
                  Go to Course
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* End Card */}
      </div>
      {/* End Grid */}
    </div>
  );
};

export default PopularCourses;
