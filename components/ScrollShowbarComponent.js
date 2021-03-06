import Link from "next/link";
import { BsArrowLeftCircle, BsArrowRightCircle } from "react-icons/bs";
import dummyPic from "../assets/pg1.jpg";

export default function ScrollShowbarComponent(props) {
  const scroll = (val) => {
    document.getElementsByClassName("recentUploadsContainer")[0].scrollLeft +=
      val;
  };
  const renderCards = () => {
    return props.recentUploads.map((project, index) => {
      return (
        <div className="projectCard" key={index}>
          <Link
            href={{
              pathname: "/project",
              query: { index: project.index },
            }}
          >
            <a>
              <div
                className="cardImg"
                style={{
                  backgroundImage: project.cid
                    ? `url(${"https://" + project.cid})`
                    : dummyPic,
                }}
              ></div>
            </a>
          </Link>
          <div className="cardDetail">
            <div className="cardTitle">
              <Link
                href={{
                  pathname: "/project",
                  query: { index: project.index },
                }}
              >
                <a>{project.projectName}</a>
              </Link>
            </div>
            <div className="cardDesc">{project.projectDescription}</div>
            <div className="cardAuthor">{"By " + project.creatorName}</div>
          </div>
        </div>
      );
    });
  };
  return (
    <div className="recentUploads">
      <div className="recentUploadsHeader">
        <div className="recentUploadsHeading">{props.heading}</div>
        {props.recentUploads.length ? (
          <div className="scrollButtons">
            <BsArrowLeftCircle
              className="scrollNavBtn"
              onClick={() => scroll(-300)}
            />
            <BsArrowRightCircle
              className="scrollNavBtn"
              onClick={() => scroll(300)}
            />
          </div>
        ) : (
          ""
        )}
      </div>

      <div className="recentUploadsContainer">
        {props.recentUploads.length ? (
          renderCards()
        ) : (
          <div className="noProjects">{props.emptyMessage}</div>
        )}
      </div>
    </div>
  );
}
