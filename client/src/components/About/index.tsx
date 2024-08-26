import Layout from "../Layouts";
import Hero from "./Hero";
import ParallaxPage from "./ParallaxPage";
import Testimotion from "./Testimotion";
import Vision from "./Vision";
const About = ({
    account,
    setAccount,
}: {
    account: string | null;
    setAccount: React.Dispatch<React.SetStateAction<string | null>>;
}) => {
    return (
        <>
            <Layout setAccount={setAccount} account={account} />
            <div className="hidden lg:block">
                <ParallaxPage />
            </div>
            <div className="block lg:hidden">
                <Hero />
                <Vision />
                <Testimotion />
            </div>
        </>
    );
};

export default About;
