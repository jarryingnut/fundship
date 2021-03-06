import PaymentModal from "../components/PaymentModal";
import { useEffect, useState, useContext } from "react";
import Link from "next/link";
import dummyPic from "../assets/pg1.jpg";
import { AccountContext } from "../context";
import { FaSpinner } from "react-icons/fa";

function ProjectComponent({ index }) {
  const [modalShow, setModalShow] = useState(false);
  const [loading, setLoading] = useState();
  const [projectDetails, setProjectDetails] = useState({
    amountRaised: 0,
    cid: "",
    creatorName: "",
    fundingGoal: 0,
    projectDescription: "",
    projectName: "",
    contributors: [],
    creationTime: 0,
    duration: 0,
    projectLink: "",
    amount: [],
    creatorAddress: "",
    category: "",
  });
  const [timerString, setTimerString] = useState("");
  const [isOver, setIsOver] = useState(false);
  const { contract, userAddress } = useContext(AccountContext);

  const PRECISION = 10 ** 18;

  // func to update the progress bar everytime getProjectDetails() executes.
  function updateProgressBar() {
    let progressBar = document.getElementsByClassName("progressBar")[0];
    progressBar.max = projectDetails.fundingGoal / PRECISION;
    progressBar.value = projectDetails.amountRaised / PRECISION;
  }

  // fetch the project details from the smart contract
  async function getProjectDetails() {
    try {
      // fetching project information from the contract
      let res = await contract.getProject(parseInt(index)).then((res) => {
        let {
          amountRaised,
          cid,
          creatorName,
          fundingGoal,
          projectDescription,
          projectName,
          contributors,
          creationTime,
          duration,
          projectLink,
          amount,
          creatorAddress,
          refundPolicy,
          category,
          refundClaimed,
          claimedAmount,
        } = { ...res };

        let tmp = [];
        for (const index in contributors) {
          tmp.push({
            contributor: contributors[index],
            amount: amount[index],
            refundClaimed: refundClaimed[index],
          });
        }

        tmp.sort((a, b) => {
          return b.amount - a.amount;
        });

        let contributorsCopy = [];
        let amountCopy = [];
        let refundClaimedCopy = [];
        for (const index in tmp) {
          contributorsCopy.push(tmp[index].contributor);
          amountCopy.push(tmp[index].amount);
          refundClaimedCopy.push(tmp[index].refundClaimed);
        }

        setProjectDetails({
          amountRaised: amountRaised,
          cid: cid,
          creatorName: creatorName,
          fundingGoal: fundingGoal,
          projectDescription: projectDescription,
          projectName: projectName,
          contributors: contributorsCopy,
          creationTime: creationTime * 1,
          duration: duration,
          projectLink: projectLink,
          amount: amountCopy,
          creatorAddress: creatorAddress,
          refundPolicy: refundPolicy,
          category: category,
          refundClaimed: refundClaimedCopy,
          claimedAmount: claimedAmount,
        });
      });
    } catch (error) {
      alert("Error fetching details");
      console.log(error);
    }
  }

  useEffect(() => {
    getProjectDetails();
  }, []);

  useEffect(() => {
    getProjectDetails();
  }, [modalShow]);

  // useEffect hook to handle the countdown timer
  useEffect(() => {
    const interval = setInterval(() => {
      const currentTime = new Date().getTime() / 1000;
      const remainingTime =
        Number(projectDetails.creationTime) +
        Number(projectDetails.duration) -
        currentTime;
      const days = Math.floor(remainingTime / (60 * 60 * 24));
      const hours = Math.floor((remainingTime % (60 * 60 * 24)) / (60 * 60));
      const minutes = Math.floor((remainingTime % (60 * 60)) / 60);
      const seconds = Math.floor(remainingTime % 60);

      setTimerString(`${days}d ${hours}h ${minutes}m ${seconds}s`);

      if (remainingTime < 0) {
        setTimerString("0d 0h 0m 0s");
        clearInterval(interval);
        // this condition is set because at initial render, creationTime and duration state are not set
        // so remaining time turns out to be negative
        if (projectDetails.creationTime > 0) {
          setIsOver(true);
        }
      }
    }, 1000);

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [projectDetails.creationTime, projectDetails.duration]);

  useEffect(() => {
    updateProgressBar();
  }, [projectDetails]);

  // sets the condition true for payment modal to render
  function onClickPayment() {
    setModalShow(true);
  }

  // return category code
  function getCategoryFromCode(val) {
    let categoryCode = [
      "Design & Tech",
      "Film",
      "Arts",
      "Games",
      "Social Cause",
    ];
    if (val >= 0 && val < 5) return categoryCode[val];
  }

  // convert epoch time format to dd/mm/yyyy format
  function displayDate(val) {
    let date = new Date(val * 1000);
    return (
      date.getDate() + "/" + (date.getMonth() + 1) + "/" + date.getFullYear()
    );
  }

  // check if user is the project owner
  function isOwner() {
    return userAddress === projectDetails.creatorAddress;
  }

  // check if claiming fund is possible for the project owner
  function claimFundCheck() {
    return projectDetails.refundPolicy
      ? projectDetails.amountRaised / PRECISION
      : projectDetails.amountRaised >= projectDetails.fundingGoal;
  }

  // claim fund by calling function in the smart contract
  async function claimFund() {
    let txn;
    try {
      txn = await contract.claimFund(parseInt(index));
      setLoading(true);
      await txn.wait(txn);
      setLoading(false);
      alert("Fund succesfully claimed");

      setProjectDetails({
        amountRaised: projectDetails.amountRaised,
        cid: projectDetails.cid,
        creatorName: projectDetails.creatorName,
        fundingGoal: projectDetails.fundingGoal,
        projectDescription: projectDetails.projectDescription,
        projectName: projectDetails.projectName,
        contributors: projectDetails.contributors,
        creationTime: projectDetails.creationTime * 1,
        duration: projectDetails.duration,
        projectLink: projectDetails.projectLink,
        amount: projectDetails.amount,
        creatorAddress: projectDetails.creatorAddress,
        refundPolicy: projectDetails.refundPolicy,
        category: projectDetails.category,
        refundClaimed: projectDetails.refundClaimed,
        claimedAmount: true,
      });
    } catch (error) {
      setLoading(false);
      alert("Error claiming fund: " + error);
      console.log(error);
    }
  }

  // check if the user is a contributor to the project
  function checkIfContributor() {
    let idx = getContributorIndex();
    return idx < 0 ? false : true;
  }

  // get the contributor index of the user in the contributor[]
  function getContributorIndex() {
    let idx = projectDetails.contributors.indexOf(userAddress);
    return idx;
  }

  // check if claiming refund is possible for the user
  function claimRefundCheck() {
    return projectDetails.refundPolicy
      ? false
      : projectDetails.amountRaised < projectDetails.fundingGoal;
  }

  // claim refund by calling the function in the smart contract
  async function claimRefund() {
    let txn;
    try {
      txn = await contract.claimRefund(parseInt(index));
      setLoading(true);
      await txn.wait(txn);
      setLoading(false);
      alert("Refund claimed succesfully");
      let refundClaimedCopy = [...projectDetails.refundClaimed];
      refundClaimedCopy[getContributorIndex()] = true;

      setProjectDetails({
        amountRaised: projectDetails.amountRaised,
        cid: projectDetails.cid,
        creatorName: projectDetails.creatorName,
        fundingGoal: projectDetails.fundingGoal,
        projectDescription: projectDetails.projectDescription,
        projectName: projectDetails.projectName,
        contributors: projectDetails.contributors,
        creationTime: projectDetails.creationTime * 1,
        duration: projectDetails.duration,
        projectLink: projectDetails.projectLink,
        amount: projectDetails.amount,
        creatorAddress: projectDetails.creatorAddress,
        refundPolicy: projectDetails.refundPolicy,
        category: projectDetails.category,
        refundClaimed: refundClaimedCopy,
        claimedAmount: true,
      });
    } catch (error) {
      setLoading(false);
      alert("Error claiming refund: " + error);
      console.log(error);
    }
  }

  return (
    <>
      <div className="projectContainer">
        <div className="projectHeading">
          <h1>{projectDetails.projectName}</h1>
        </div>
        <div className="projectTopContainer">
          <div className="projectImage">
            <img
              src={
                projectDetails.cid ? "https://" + projectDetails.cid : dummyPic
              }
              alt="test-pic"
            />
          </div>
          <div className="projectInformationContainer">
            <div className="progressBarContainer">
              <progress
                min="0"
                max="100"
                value="30"
                className="progressBar"
              ></progress>
            </div>
            <div className="fundingValue">
              <h2>{projectDetails.amountRaised / PRECISION} MATIC</h2>
            </div>
            <p className="goalValueContainer">
              pledged of{" "}
              <span className="goalValue">
                {projectDetails.fundingGoal / PRECISION} MATIC
              </span>{" "}
              goal
            </p>
            <div className="supporterContainer">
              <h2>{projectDetails.contributors.length}</h2>
            </div>
            <p className="afterSupporterContainer">backers</p>
            <div className="remainingDaysContainer">
              <h2>{!isOver ? timerString : "Funding duration over!!"}</h2>
            </div>
            {!isOver && (
              <p className="afterRemainingDaysContainer">
                time left for funding
              </p>
            )}
            {!isOver ? (
              !isOwner() && (
                <div className="supportButtonContainer">
                  <button
                    className="supportButton"
                    onClick={() => onClickPayment()}
                  >
                    Back this project
                  </button>
                </div>
              )
            ) : isOwner() ? (
              claimFundCheck() && !projectDetails.claimedAmount ? (
                <div className="supportButtonContainer">
                  <button
                    className="supportButton"
                    disabled={loading}
                    onClick={() => claimFund()}
                  >
                    {loading ? (
                      <FaSpinner icon="spinner" className="spinner" />
                    ) : (
                      "Claim Fund"
                    )}
                  </button>
                </div>
              ) : projectDetails.claimedAmount ? (
                <h2 style={{ color: "red" }}>Fund claimed!</h2>
              ) : (
                ""
              )
            ) : checkIfContributor() &&
              claimRefundCheck() &&
              !projectDetails.refundClaimed[getContributorIndex()] ? (
              <div className="supportButtonContainer">
                <button
                  className="supportButton"
                  disabled={loading}
                  onClick={() => claimRefund()}
                >
                  {loading ? (
                    <FaSpinner icon="spinner" className="spinner" />
                  ) : (
                    "Claim Refund"
                  )}
                </button>
              </div>
            ) : projectDetails.refundClaimed[getContributorIndex()] ? (
              <h2 style={{ color: "red" }}>Refund Claimed!</h2>
            ) : (
              ""
            )}
            {modalShow && (
              <PaymentModal
                setModalShow={setModalShow}
                contract={contract}
                index={index}
                projectDetails={projectDetails}
                setProjectDetails={setProjectDetails}
                userAddress={userAddress}
              />
            )}
          </div>
        </div>
        <div className="projectBottomContainer">
          <div className="aboutContainer">
            <h1 className="about">About</h1>
            <p className="description">{projectDetails.projectDescription}</p>
          </div>
          <div className="projectLinkContainerWrapper">
            <div className="projectLinkContainer">
              <p className="projectLinkLabel">
                Refund Policy:{" "}
                {projectDetails.refundPolicy ? "Non-Refundable " : "Refundable"}
              </p>
            </div>
            <div className="projectLinkContainer">
              <a
                className="projectLink projectLinkLabel"
                target="_blank"
                href={projectDetails.projectLink}
                rel="noreferrer"
              >
                Project Link
              </a>
            </div>
            <div className="projectLinkContainer">
              <Link
                href={{
                  pathname: "/profile",
                  query: {
                    address: projectDetails.creatorAddress,
                    name: projectDetails.creatorName,
                  },
                }}
              >
                <a className="projectLink projectLinkLabel">{`Owner: ${projectDetails.creatorName}`}</a>
              </Link>
            </div>
            <div className="projectLinkContainer">
              <p className="projectLinkLabel">
                Category: {getCategoryFromCode(projectDetails.category)}
              </p>
            </div>
            <div className="projectLinkContainer">
              <p className="projectLinkLabel">
                Creation date: {displayDate(projectDetails.creationTime)}
              </p>
            </div>
          </div>
        </div>
        <div className="contributorHeader">Contributors</div>
        <div className="contributors">
          <div className="tableRow header">
            <div className="item border" style={{ width: "80px" }}>
              Sno.
            </div>
            <div className="item border">Address</div>
            <div className="item border">Amount</div>
          </div>
          {projectDetails.contributors.length > 0 ? (
            projectDetails.contributors.map((contributor, idx) => (
              <div
                className={
                  "tableRow " + (idx % 2 === 0 ? "darkRow" : "lightRow")
                }
                key={idx}
              >
                <div className="item border" style={{ width: "80px" }}>
                  {idx + 1 + "."}
                </div>
                <div className="item border">{contributor}</div>
                <div className="item border">
                  {projectDetails.amount[idx] / PRECISION}
                </div>
              </div>
            ))
          ) : (
            <div className="noProjects">No contributors yet</div>
          )}
        </div>
      </div>
    </>
  );
}

export async function getServerSideProps({ query }) {
  const { index = 1 } = query;

  return {
    props: { index },
  };
}

export default ProjectComponent;
