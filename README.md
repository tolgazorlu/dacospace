<a name="readme-top"></a>

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="#">
    <img style="border-radius: 10px" src="/daco-logo.png" alt="Logo" width="80" height="80">
  </a>

  <h3 align="center">DACOSPACE</h3>

  <p align="center">
    BY TOLGA ZORLU
    <br />
    <a href="https://www.daco.space/"><strong>View Demo</strong></a>
    <br />
    <br />
    <a href="https://github.com/tolgazorlu/daco/issues">Report Bug</a>
    ·
    <a href="https://github.com/tolgazorlu/daco/issues">Request Feature</a>
  </p>
</div>

## About The Project

DACO - Where Challenges Ignite Brilliance!

Are you ready to embark on a daily journey of problem-solving and intellectual exploration? Look no further! DACO is your go-to destination for sharpening your coding skills and mastering the art of algorithms.

Every day, we present you with <strong>two brand-new algorithm questions</strong> carefully crafted to challenge your mind and hone your problem-solving abilities. Whether you're a beginner eager to learn the basics or a seasoned coder aiming to refine your expertise, our daily challenges cater to all levels of proficiency.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->

## Getting Started

This is an MERN Stack example of e-commerce project.
To get a local copy up and running follow these simple example steps.

### Prerequisites

This is an example of how to list things you need to use the software and how to install them.

- npm
  ```sh
  npm install npm@latest -g
  ```

### Installation

_Below is an example of how you can instruct your audience on installing and setting up your app. This project doesn't rely on any external dependencies or services._

1. Clone the repo
   ```sh
   $ git clone https://github.com/tolgazorlu/dacospace_v1.git
   ```
2. Install client packages
   ```sh
   $ cd client
   $ npm install
   $ npm run dev
   ```
3. Compile contracts packages

   ```sh
   $ cd contracts
   $ forge install
   $ forge compile

   $ forge script script/DeployDacospace.s.sol --broadcast --rpc-url https://rpc.open-campus-codex.gelato.digital/ --gas-limit 30000000 --with-gas-price 5gwei --skip-simulation

   $ forge verify-contract \
   --rpc-url https://rpc.open-campus-codex.gelato.digital \
   --verifier blockscout \
   --verifier-url 'https://opencampus-codex.blockscout.com/api/' \
   <your address> \
   src/Dacospace.sol:Dacospace

   $ forge help # Foundry Help
   ```

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTRIBUTING -->

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- LICENSE -->

## License

Distributed under the MIT License. See `LICENSE.txt` for more information.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTACT -->

## Contact

Tolga Zorlu - [@linkedin](https://www.linkedin.com/in/tolgazorlu/)

Project Link: [https://github.com/tolgazorlu/daco](https://github.com/tolgazorlu/dacospace_v1)

<p align="right">(<a href="#readme-top">back to top</a>)</p>
