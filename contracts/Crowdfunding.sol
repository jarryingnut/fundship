pragma solidity >= 0.8.0 < 0.9.0;

contract Crowdfunding {

    enum Category {
      DESIGNANDTECH,
      FILM,
      ARTS,
      GAMES,
      SOCIALCAUSE
    }

    // Refund policies 
    enum RefundPolicy {
        REFUNDABLE,
        NONREFUNDABLE
    }

    struct Project {
        string projectName;             
        string projectDescription;      
        string creatorName;             
        string projectLink;             
        string cid;                   // ipfs link of the image   
        uint256 fundingGoal;            
        uint256 duration;             // duration of project in minutes     
        uint256 creationTime;           
        uint256 amountRaised;           
        address creatorAddress;         
        Category category;                
        RefundPolicy refundPolicy;      
        address[] contributors;         // keeps the contributors of this project
        uint256[] amount;               // keeps the amount contributed by conrtibutors at corresponding index at contributors array
        bool[] refundClaimed;           // Keeps record if the contributors claimed refund at cooresponding index at contributors array
        bool claimedAmount;             // Keeps record if creator claimed raised funds
    }

    struct ProjectMetadata {
        string projectName;             
        string projectDescription;      
        string creatorName;             
        string cid;                     
        uint256 fundingGoal;            
        uint256 amountRaised;           
        uint256 totalContributors;      
        uint256 creationTime;           
        uint256 duration;               
        Category category;              
    }

    struct Funded {
      uint256 projectIndex;           // Stores the project index of project that's funded
      uint256 totalAmount;            // Stores the amount funded
    }

    Project[] projects;

    // Stores the indexes of projects created on projects list by an address
    mapping(address => uint256[]) addressProjectsList;

    // Stores the list of fundings  by an address
    mapping(address => Funded[]) addressFundingList;

    modifier validIndex(uint256 _index) {
        require(_index < projects.length, "Invalid Project Id");
        _;
    }

    //creates new project
    function createNewProject(
        string memory _name,
        string memory _desc,
        string memory _creatorName,
        string memory _projectLink,
        string memory _cid,
        uint256 _fundingGoal,
        uint256 _duration,
        Category _category,
        RefundPolicy _refundPolicy
    ) external {
        projects.push(Project({
            creatorAddress: msg.sender,
            projectName: _name,
            projectDescription: _desc,
            creatorName: _creatorName,
            projectLink: _projectLink,
            cid: _cid,
            fundingGoal: _fundingGoal * 10**18,
            duration: _duration * (1 minutes),
            creationTime: block.timestamp,
            category: _category,
            refundPolicy: _refundPolicy,
            amountRaised: 0,
            contributors: new address[](0),
            amount: new uint256[](0),
            claimedAmount: false,
            refundClaimed: new bool[](0)
        }));
        addressProjectsList[msg.sender].push(projects.length - 1);
    }

    function getAllProjectsDetail() external view returns(ProjectMetadata[] memory allProjects) {     // returns metadata for all projects
      ProjectMetadata[] memory newList = new ProjectMetadata[](projects.length);
      for(uint256 i = 0; i < projects.length; i++){
          newList[i] = ProjectMetadata(
              projects[i].projectName,
              projects[i].projectDescription,
              projects[i].creatorName,
              projects[i].cid,
              projects[i].fundingGoal,
              projects[i].amountRaised,
              projects[i].contributors.length,
              projects[i].creationTime,
              projects[i].duration,
              projects[i].category
          );
      }
      return newList;
    }

    // Returns array of metadata of project at respective indexes 
    function getProjectsDetail(uint256[] memory _indexList) external view returns(ProjectMetadata[] memory projectsList) {  
      ProjectMetadata[] memory newList = new ProjectMetadata[](_indexList.length);
      for(uint256 index = 0; index < _indexList.length; index++) {
          if(_indexList[index] < projects.length) {
              uint256 i = _indexList[index]; 
              newList[index] = ProjectMetadata(
                  projects[i].projectName,
                  projects[i].projectDescription,
                  projects[i].creatorName,
                  projects[i].cid,
                  projects[i].fundingGoal,
                  projects[i].amountRaised,
                  projects[i].contributors.length,
                  projects[i].creationTime,
                  projects[i].duration,
                  projects[i].category
              );
          } else {
              newList[index] = ProjectMetadata(
                  "Invalid Project",
                  "Invalid Project",
                  "Invalid Project",
                  "Invalid Project",
                  0,
                  0,
                  0,
                  0,
                  0,
                  Category.DESIGNANDTECH
              );
          }
      }
      return newList;
    }

    
    function getProject(uint256 _index) external view validIndex(_index) returns(Project memory project) {
      return projects[_index];
    }

    function getCreatorProjects(address creator) external view returns(uint256[] memory createdProjects) {
      return addressProjectsList[creator];
    }

    function getUserFundings(address contributor) external view returns(Funded[] memory fundedProjects) {
      return addressFundingList[contributor];
    }

    // Helper function adds details of Funding to addressFundingList
    function addToFundingList(uint256 _index) internal validIndex(_index) {
        for(uint256 i = 0; i < addressFundingList[msg.sender].length; i++) {
            if(addressFundingList[msg.sender][i].projectIndex == _index) {
                addressFundingList[msg.sender][i].totalAmount += msg.value;
                return;
            }
        }
        addressFundingList[msg.sender].push(Funded(_index, msg.value));
    }

    // Helper function adds details of funding to the project in projects array
    function addContribution(uint256 _index) internal validIndex(_index)  {
        for(uint256 i = 0; i < projects[_index].contributors.length; i++) {
            if(projects[_index].contributors[i] == msg.sender) {
                projects[_index].amount[i] += msg.value;
                addToFundingList(_index);
                return;
            }
        }
        projects[_index].contributors.push(msg.sender);
        projects[_index].amount.push(msg.value);
        if(projects[_index].refundPolicy == RefundPolicy.REFUNDABLE) {
            projects[_index].refundClaimed.push(false);
        }
        addToFundingList(_index);
    }

    // funds the projects 
    function fundProject(uint256 _index) payable external validIndex(_index)  {
        require(projects[_index].creatorAddress != msg.sender, "You are the project owner");
        require(projects[_index].duration + projects[_index].creationTime >= block.timestamp, "Project Funding Time Expired");
        addContribution(_index);
        projects[_index].amountRaised += msg.value;
    }

    // to claim funds by creator
    function claimFund(uint256 _index) validIndex(_index) external {
        require(projects[_index].creatorAddress == msg.sender, "You are not Project Owner");
        require(projects[_index].duration + projects[_index].creationTime < block.timestamp, "Project Funding Time Not Expired");
        require(projects[_index].refundPolicy == RefundPolicy.NONREFUNDABLE 
        || projects[_index].amountRaised >= projects[_index].fundingGoal, "Funding goal not reached");
        require(!projects[_index].claimedAmount, "Already claimed raised funds");
        projects[_index].claimedAmount = true;
        payable(msg.sender).transfer(projects[_index].amountRaised);
    }

    // helper for claim refund
    function getContributorIndex(uint256 _index) validIndex(_index) internal view returns(int256) {
        int256 contributorIndex = -1;
        for(uint256 i = 0; i < projects[_index].contributors.length; i++) {
            if(msg.sender == projects[_index].contributors[i]) {
                contributorIndex = int256(i);
                break;
            }
        }
        return contributorIndex;
    }

    //contributors can claim refund when refundable project doesn't reach its goal
    function claimRefund(uint256 _index) validIndex(_index) external {
        require(projects[_index].duration + projects[_index].creationTime < block.timestamp, "Project Funding Time Not Expired");
        require(projects[_index].refundPolicy == RefundPolicy.REFUNDABLE 
        && projects[_index].amountRaised < projects[_index].fundingGoal, "Funding goal not reached");
        
        int256 index = getContributorIndex(_index);
        require(index != -1, "You did not contribute to this project");
        
        uint256 contributorIndex = uint256(index);
        require(!projects[_index].refundClaimed[contributorIndex], "Already claimed refund amount");
        
        projects[_index].refundClaimed[contributorIndex] = true;
        payable(msg.sender).transfer(projects[_index].amount[contributorIndex]);
    }

    //need to log events to know if the transaction has been completed




    











} 