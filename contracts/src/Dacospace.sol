// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.19;

contract Dacospace {
    address public owner;

    // Course Struct
    struct Course {
        uint256 id;
        string title;
        string slug;
        string description;
        string image;
        string category;
        uint256 cost;
        uint256 rating;
        uint256 sold;
        mapping(uint256 => Content) contents; // Change from array to mapping
        uint256 contentCount; // Keep track of the number of contents
    }

    struct Content {
        uint256 id;
        string title;
        string slug;
        string content_body;
    }

    struct Order {
        uint256 time;
        uint256 courseId;
    }

    // Mappings
    mapping(uint256 => Course) public courses;
    mapping(uint256 => Content) private contentMapping; // Optional, if needed for direct access
    mapping(address => uint256) public orderCount;
    mapping(address => mapping(uint256 => Order)) public orders;

    // Events
    event Buy(address buyer, uint256 orderId, uint256 courseId);
    event List(string title, uint256 cost, uint256 sold);
    event AddCourse(uint256 courseId, string title, uint256 cost);
    event AddContent(uint256 courseId, uint256 contentId, string title);

    // Modifier
    modifier onlyOwner() {
        require(msg.sender == owner, "You must be the owner!");
        _;
    }

    // Constructor
    constructor() {
        owner = msg.sender;
    }

    // Add Course
    function addCourse(
        uint256 _id,
        string memory _title,
        string memory _slug,
        string memory _description,
        string memory _image,
        string memory _category,
        uint256 _cost,
        uint256 _rating
    ) public onlyOwner {
        require(courses[_id].id == 0, "Course ID already exists!"); // Ensure unique ID

        Course storage newCourse = courses[_id];
        newCourse.id = _id;
        newCourse.title = _title;
        newCourse.slug = _slug;
        newCourse.description = _description;
        newCourse.image = _image;
        newCourse.category = _category;
        newCourse.cost = _cost;
        newCourse.rating = _rating;
        newCourse.sold = 0; // Initialize sold to 0
        newCourse.contentCount = 0; // Initialize contentCount to 0

        emit AddCourse(_id, _title, _cost);
    }

    function createContent(
        uint256 _content_id,
        uint256 _course_id,
        string memory _title,
        string memory _slug,
        string memory _content_body
    ) public onlyOwner {
        Content memory newContent = Content({
            id: _content_id,
            title: _title,
            slug: _slug,
            content_body: _content_body
        });

        Course storage course = courses[_course_id];
        course.contents[_content_id] = newContent;
        course.contentCount++;

        emit AddContent(_course_id, _content_id, _title);
    }

    // List Courses
    function list(
        uint256 _id,
        string memory _title,
        string memory _slug,
        string memory _description,
        string memory _image,
        string memory _category,
        uint256 _cost,
        uint256 _rating,
        uint256 _sold
    ) public onlyOwner {
        Course storage course = courses[_id];
        course.id = _id;
        course.title = _title;
        course.slug = _slug;
        course.description = _description;
        course.image = _image;
        course.category = _category;
        course.cost = _cost;
        course.rating = _rating;
        course.sold = _sold;

        emit List(_title, _cost, _sold);
    }

    // Buy Courses
    function buy(uint256 _id) public payable {
        Course storage course = courses[_id];

        require(msg.value >= course.cost, "Your balance must be bigger than the cost!");

        Order memory order = Order(block.timestamp, _id);

        orderCount[msg.sender]++;
        orders[msg.sender][orderCount[msg.sender]] = order;

        course.sold += 1;

        emit Buy(msg.sender, orderCount[msg.sender], course.id);
    }

    // Withdraw Funds
    function withdraw() public onlyOwner {
        (bool success, ) = owner.call{value: address(this).balance}("");
        require(success, "Withdrawal failed!");
    }

    // Get Content Details
    function getContent(uint256 _courseId, uint256 _contentId) public view returns (Content memory) {
        return courses[_courseId].contents[_contentId];
    }
}
