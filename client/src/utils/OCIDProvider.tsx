import { OCConnect } from "@opencampus/ocid-connect-js";

interface OCIDProviderProps {
  children: React.ReactNode;
}

const opts = {
  redirectUri: "http://localhost:3000/redirect",
};

const OCIDProvider: React.FC<OCIDProviderProps> = ({ children }) => (
  <OCConnect opts={opts} sandboxMode={true}>
    {children}
  </OCConnect>
);

export default OCIDProvider;
