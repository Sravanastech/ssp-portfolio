import hero from "../assets/HeroImg.jpeg";

const Hero = () => {
  return (
    <div>
      <img
        src={hero}
        alt="Sravana's engineering expertise visualization"
        className="w-full max-h-[600px] object-cover"
      />
    </div>
  );
};

export default Hero;
