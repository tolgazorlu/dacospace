import { ToastContainer } from "react-toastify";
import Layout from "../Layouts";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";

const SingleCourse = ({
    account,
    setAccount,
    item,
    provider,
    dacospace,
}: {
    account: string | null;
    setAccount: React.Dispatch<React.SetStateAction<string | null>>;
    item: any;
    provider: any;
    dacospace: any;
}) => {
    const [order, setOrder] = useState(null);
    const [hasBought, setHasBought] = useState(false);

    const navigate = useNavigate();

    const fetchDetails = async () => {
        const events = await dacospace.queryFilter("Buy");
        const orders = events.filter(
            (event: any) =>
                event.args.buyer === account &&
                event.args.itemId.toString() === item.id.toString(),
        );

        if (orders.length === 0) return;

        const order = await dacospace.orders(account, orders[0].args.orderId);
        setOrder(order);
    };

    const buyHandler = async () => {
        const signer = await provider.getSigner();

        // Buy item...
        // const transaction = await dacospace
        //     .connect(signer)
        //     .buy(item.id, { value: item.cost });
        const transaction = await dacospace.connect(signer).buy(item.id, {
            value: item.cost,
            gasLimit: 3000000,
        });
        const res = await transaction.wait();
        console.log(res);

        setHasBought(true);
    };

    useEffect(() => {
        fetchDetails();
    }, [hasBought]);

    return (
        <>
            <Layout setAccount={setAccount} account={account} />
            <ToastContainer
                position="top-right"
                autoClose={5000}
                hideProgressBar={true}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
                theme="colored"
            />

            <div className="mt-24 px-4 w-full flex gap-4 lg:px-24">
                <div className="flex flex-col gap-4 w-full lg:w-4/6 ">
                    <div className="text-sm breadcrumbs ">
                        <ul>
                            <li>
                                <a>{item?.category}</a>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <img
                            src={item?.image}
                            className="max-h-72 w-full object-left"
                        />
                    </div>
                    <span className="text-4xl  font-bold">{item?.title}</span>
                    <span className="font-light">{item?.description}</span>
                    <div className="flex gap-4 items-center">
                        <div>
                            <span className="font-bold">
                                Rate: {item?.rating.toString()}
                            </span>
                            <br />
                            <span className="font-light">
                                Total Sold: {item?.sold.toString()}
                            </span>
                        </div>
                    </div>

                    {/* {course && (
                                <div className="flex gap-2 items-center">
                                    <span className="text-primary text-xl font-bold">
                                        {course?.rate}
                                    </span>
                                    <div className="rating rating-sm">
                                        <input
                                            type="radio"
                                            name="rating-2"
                                            className={
                                                course.rate > 0.5
                                                    ? "mask mask-star-2 bg-primary"
                                                    : "mask mask-star-2 bg-base-300"
                                            }
                                        />
                                        <input
                                            type="radio"
                                            name="rating-2"
                                            className={
                                                course.rate > 1.5
                                                    ? "mask mask-star-2 bg-primary"
                                                    : "mask mask-star-2 bg-base-300"
                                            }
                                        />
                                        <input
                                            type="radio"
                                            name="rating-2"
                                            className={
                                                course.rate > 2.5
                                                    ? "mask mask-star-2 bg-primary"
                                                    : "mask mask-star-2 bg-base-300"
                                            }
                                        />
                                        <input
                                            type="radio"
                                            name="rating-2"
                                            className={
                                                course.rate > 3.5
                                                    ? "mask mask-star-2 bg-primary"
                                                    : "mask mask-star-2 bg-base-300"
                                            }
                                        />
                                        <input
                                            type="radio"
                                            name="rating-2"
                                            className={
                                                course.rate > 4.5
                                                    ? "mask mask-star-2 bg-primary"
                                                    : "mask mask-star-2 bg-base-300"
                                            }
                                        />
                                    </div>
                                </div>
                            )} */}
                    <div className="flex gap-8 items-between">
                        <div className="flex gap-2 items-center">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                className="w-4 h-4 stroke-inherit"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M4.755 10.059a7.5 7.5 0 0 1 12.548-3.364l1.903 1.903h-3.183a.75.75 0 1 0 0 1.5h4.992a.75.75 0 0 0 .75-.75V4.356a.75.75 0 0 0-1.5 0v3.18l-1.9-1.9A9 9 0 0 0 3.306 9.67a.75.75 0 1 0 1.45.388Zm15.408 3.352a.75.75 0 0 0-.919.53 7.5 7.5 0 0 1-12.548 3.364l-1.902-1.903h3.183a.75.75 0 0 0 0-1.5H2.984a.75.75 0 0 0-.75.75v4.992a.75.75 0 0 0 1.5 0v-3.18l1.9 1.9a9 9 0 0 0 15.059-4.035.75.75 0 0 0-.53-.918Z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            <span className=" text-sm">
                                Last update:{" "}
                                {/* {course?.updatedAt.split("T")[0]} */}
                                Lorem Ipsum
                            </span>
                        </div>
                        <div className="flex gap-2 items-center">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                className="w-4 h-4 stroke-inherit"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M9 2.25a.75.75 0 0 1 .75.75v1.506a49.384 49.384 0 0 1 5.343.371.75.75 0 1 1-.186 1.489c-.66-.083-1.323-.151-1.99-.206a18.67 18.67 0 0 1-2.97 6.323c.318.384.65.753 1 1.107a.75.75 0 0 1-1.07 1.052A18.902 18.902 0 0 1 9 13.687a18.823 18.823 0 0 1-5.656 4.482.75.75 0 0 1-.688-1.333 17.323 17.323 0 0 0 5.396-4.353A18.72 18.72 0 0 1 5.89 8.598a.75.75 0 0 1 1.388-.568A17.21 17.21 0 0 0 9 11.224a17.168 17.168 0 0 0 2.391-5.165 48.04 48.04 0 0 0-8.298.307.75.75 0 0 1-.186-1.489 49.159 49.159 0 0 1 5.343-.371V3A.75.75 0 0 1 9 2.25ZM15.75 9a.75.75 0 0 1 .68.433l5.25 11.25a.75.75 0 1 1-1.36.634l-1.198-2.567h-6.744l-1.198 2.567a.75.75 0 0 1-1.36-.634l5.25-11.25A.75.75 0 0 1 15.75 9Zm-2.672 8.25h5.344l-2.672-5.726-2.672 5.726Z"
                                    clipRule="evenodd"
                                />
                            </svg>

                            <span className=" text-sm">
                                Language: Lorem Ipsum
                            </span>
                        </div>
                    </div>

                    <hr className="border border-base-200"></hr>
                    <div
                        tabIndex={0}
                        className="collapse bg-gradient-to-r from-[#e8e7ff] to-[#d3d2ff] text-[#4716eb] rounded-sm focus:bg-secondary focus:text-secondary-content"
                    ></div>
                    <hr className="border border-base-200"></hr>
                    {/* {course && <Comment course={course} />} */}
                </div>
                {/* {course && <EnrollSide course={course} />} */}
                <div className="w-2/6 hidden lg:block mt-16">
                    <div className="border border-base-300">
                        <figure>
                            {/* <img src={props.course.image} alt="Shoes" /> */}
                        </figure>
                        <div className="card-body">
                            <h2 className="card-title">
                                Only {item?.cost.toString().slice(0, 2)}
                                <span className="text-secondary">ETH</span>
                            </h2>
                            <p>Why are you waiting? Take a step to learn!</p>
                            {/* {isEnrolled ? (
                            <a
                                className={
                                    !isEnrolled
                                        ? "btn btn-disabled"
                                        : "btn bg-gradient-to-r from-[#694dff] to-[#4716eb] text-white"
                                }
                                href={
                                    "/course/" + props.course.slug + "/lessons"
                                }
                            >
                                {isLoading ? (
                                    <span className="loading loading-spinner loading-md"></span>
                                ) : (
                                    <span>Lessons</span>
                                )}
                            </a>
                        ) : (
                            <button
                                className="btn bg-gradient-to-r from-[#694dff] to-[#4716eb] text-white"
                                onClick={submitHandler}
                            >
                                {isLoading ? (
                                    <span className="loading loading-spinner loading-md"></span>
                                ) : (
                                    <span>Enroll Now</span>
                                )}
                            </button>
                        )} */}

                            {hasBought ? (
                                <>
                                    <button
                                        className="btn bg-primary text-white"
                                        onClick={() => {
                                            navigate("/content");
                                        }}
                                    >
                                        <span>Go course</span>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        className="btn bg-primary text-white"
                                        onClick={buyHandler}
                                    >
                                        <span>Enroll Now</span>
                                    </button>
                                </>
                            )}

                            {order && (
                                <div className="product__bought">
                                    Item bought on <br />
                                </div>
                            )}

                            <ul className="text-sm flex flex-col gap-1">
                                {/* {props.course.content_information.map(
                                (item, index) => {
                                    return (
                                        <li
                                            className="flex items-center gap-2"
                                            key={index}
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                strokeWidth={1.5}
                                                stroke="currentColor"
                                                className="w-4 h-4"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
                                                />
                                            </svg>
                                            <span>{item}</span>
                                        </li>
                                    );
                                },
                            )} */}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SingleCourse;
