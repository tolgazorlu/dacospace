/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useEffect } from "react";
import Web3 from "web3";

const PopularCourses = ({ courses, contracts, user }: any) => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);

  const [modalId, setModalId] = useState("");
  const [courseIndex, setCourseIndex] = useState(0);
  const [purchasedCourses, setPurchasedCourses] = useState<{
    [key: number]: boolean;
  }>({});

  // Fetch purchased courses
  useEffect(() => {
    const checkPurchasedCourses = async () => {
      if (contracts && user) {
        const web3 = new Web3(window.ethereum);
        await window.ethereum.request({ method: "eth_requestAccounts" });
        const accounts = await web3.eth.getAccounts();
        const ordersCount = await contracts.methods
          .orderCount(accounts[0])
          .call();

        const purchased = {} as { [key: number]: boolean };

        for (let i = 1; i <= ordersCount; i++) {
          const order = await contracts.methods.orders(accounts[0], i).call();
          purchased[order.courseId] = true;
        }

        setPurchasedCourses(purchased);
      }
    };

    checkPurchasedCourses();
  }, [contracts, user]);

  // Handle course purchase
  const buyHandler = async () => {
    if (contracts && courses[courseIndex]) {
      const web3 = new Web3(window.ethereum);
      await window.ethereum.request({ method: "eth_requestAccounts" });
      const accounts = await web3.eth.getAccounts();

      try {
        const transaction = await contracts.methods
          .buy(courses[courseIndex].id)
          .send({
            from: accounts[0],
            value: web3.utils.toWei(
              courses[courseIndex].cost.toString(),
              "ether"
            ),
            gasLimit: 3000000,
          });

        console.log(transaction);
        setPurchasedCourses((prevState) => ({
          ...prevState,
          [courses[courseIndex].id]: true,
        }));
      } catch (error) {
        console.error("Transaction failed", error);
      }
    }
  };

  // Show modal when modalId changes
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
      <div className="flex flex-col items-start py-4">
        <h1 className="text-2xl font-semibold">Best Courses</h1>
        <span className="text-lg font-light mb-4">
          You can select what you need to learn.
        </span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {courses.map((course: any, index: number) => (
          <div
            className="card card-compact bg-base-100 shadow-xl border-2 border-base-content"
            key={course.id} // Use course ID as key
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
                {purchasedCourses[course.id] ? (
                  <button className="btn btn-primary text-accent">
                    Go to Lessons
                  </button>
                ) : (
                  <button
                    className="btn btn-primary text-primary-content"
                    onClick={() => openModal(course.id, index)}
                  >
                    Buy this course
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <dialog ref={dialogRef} className="modal">
        <div className="modal-box w-10/12 max-w-4xl p-0 border-2 border-primary flex">
          <img src={courses[courseIndex]?.image} className="w-1/3" />
          <div className="p-4 flex flex-col w-full justify-between">
            <div>
              <h3 className="font-bold text-2xl">
                {courses[courseIndex]?.title}
              </h3>
              <p>{courses[courseIndex]?.description}</p>
            </div>
            <div className="modal-action">
              <button className="btn" onClick={closeModal}>
                Close
              </button>
              {!purchasedCourses[courses[courseIndex]?.id] ? (
                <button
                  onClick={buyHandler}
                  className="btn btn-primary text-accent"
                >
                  {courses[courseIndex]?.cost
                    ? `${courses[courseIndex].cost} EDU`
                    : "Cost not available"}
                </button>
              ) : (
                <button className="btn btn-primary text-accent">
                  Go to Lessons
                </button>
              )}
            </div>
          </div>
        </div>
      </dialog>
    </div>
  );
};

export default PopularCourses;
