/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from "react";

const PopularCourses = ({ courses }: any) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const [modalId, setModalId] = useState("");
  const [courseIndex, setCourseIndex] = useState(0);

  useEffect(() => {
    if (modalId && dialogRef.current) {
      dialogRef.current.showModal();
    }
  }, [modalId]);

  const openModal = (courseId: string, index: number) => {
    setCourseIndex(index);
    setModalId(courseId);
  };

  const closeModal = () => {
    setModalId("");
    setCourseIndex(0);
    if (dialogRef.current) {
      dialogRef.current.close();
    }
  };

  return (
    <div className="px-4 lg:px-24 py-10 mt-14">
      {/* Title */}
      <div className="flex flex-col items-start py-4">
        <h1 className="text-2xl font-semibold">Best Courses</h1>
        <span className="text-lg font-light mb-4">
          You can select what you need to learn.
        </span>
      </div>
      {/* End Title */}
      {/* Grid */}
      <div className="grid sm:grid-cols-4 gap-4">
        {/* Card */}
        {courses.map((course: any, index: number) => (
          <div
            className="card card-compact bg-base-100 shadow-xl border-2 border-base-content"
            key={index}
          >
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
                  className="btn btn-primary text-primary-content"
                  onClick={() => openModal(course.id, index)}
                >
                  Buy this course
                </button>
              </div>
            </div>
          </div>
        ))}
        {/* End Card */}
      </div>
      {/* End Grid */}

      {/* Modal */}
      <dialog ref={dialogRef} className="modal">
        <div className="modal-box w-10/12 max-w-5xl p-0 border-2 border-primary">
          <img src={courses[courseIndex]?.image} className="w-full" />
          <div className="p-4">
            <h3 className="font-bold text-lg">{courses[courseIndex]?.title}</h3>
            <p>{courses[courseIndex]?.description}</p>
            <div className="modal-action py-4">
              <button className="btn" onClick={closeModal}>
                Close
              </button>
              <button className="btn btn-primary">Buy this course</button>
            </div>
          </div>
        </div>
      </dialog>
      {/* End Modal */}
    </div>
  );
};

export default PopularCourses;
