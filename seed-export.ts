
// This file exports the initial data for the application.
// Updated with Electronics & Electrical Communication Engineering (ECE) faculty data.

export const fallbackData = {
    departments: [
        {
            id: "dept_ece",
            name: "Electronics & Electrical Communication Engineering",
            branches: ["branch_ece"]
        }
    ],
    branches: {
        "branch_ece": {
            id: "branch_ece",
            name: "ECE",
            departmentId: "dept_ece"
        }
    },
    professors: {
        "prof_ece_1": {
            id: "prof_ece_1",
            name: "Amitabha Bhattacharya",
            position: "Professor",
            email: "amitabha@ece.iitkgp.ac.in",
            degree: "Ph.D.",
            branch: "branch_ece",
            departmentId: "dept_ece",
            description: "Engineered electromagnetic materials, radar signal processing, microwave imaging, antenna design, satellite navigation, radar target identification, electromagnetic interference, and radar absorbing materials with composite materials applications.",
            photo: "/ece/download.png",
            links: {
                webpage: "https://www.iitkgp.ac.in/department/EC/faculty/ec-amitabha",
                awards: "",
                bio: ""
            },
            research: [
                "Engineered electromagnetic materials",
                "Radar signal processing",
                "Microwave imaging",
                "Antenna design",
                "Satellite navigation",
                "Radar target identification",
                "Electromagnetic interference",
                "Radar absorbing materials"
            ],
            projects: [],
            companies: [],
            websites: [],
            institutes: []
        },
        "prof_ece_2": {
            id: "prof_ece_2",
            name: "Amitalok Jayant Budkuley",
            position: "Assistant Professor Grade-I",
            email: "amitalok@ece.iitkgp.ac.in",
            degree: "Ph.D.",
            branch: "branch_ece",
            departmentId: "dept_ece",
            description: "Fundamental limits of cryptographic primitives over unreliable Gaussian noisy channels, information theory, distributed sampling, coding theory, and secure multi-party computation.",
            photo: "/ece/download(1).png",
            links: {
                webpage: "https://www.iitkgp.ac.in/department/EC/faculty/ec-amitalok",
                awards: "",
                bio: ""
            },
            research: [
                "Cryptographic primitives",
                "Gaussian noisy channels",
                "Information theory",
                "Distributed sampling",
                "Coding theory",
                "Secure multi-party computation"
            ],
            projects: [],
            companies: [],
            websites: [],
            institutes: []
        },
        "prof_ece_3": {
            id: "prof_ece_3",
            name: "Basudev Lahiri",
            position: "Assistant Professor Grade-I",
            email: "blahiri@ece.iitkgp.ac.in",
            degree: "Ph.D.",
            branch: "branch_ece",
            departmentId: "dept_ece",
            description: "Photonic wire waveguides, 2D materials, solar cells, neuromorphic devices, bio nano photonics, photonic instrumentation and imaging, metamaterials, biophotonics, and nanofabrication for biomedical sensor design.",
            photo: "/ece/download(2).png",
            links: {
                webpage: "https://www.iitkgp.ac.in/department/EC/faculty/ec-blahiri",
                awards: "",
                bio: ""
            },
            research: [
                "Photonic wire waveguides",
                "2D materials",
                "Solar cells",
                "Neuromorphic devices",
                "Bio nano photonics",
                "Photonic instrumentation",
                "Metamaterials",
                "Biophotonics",
                "Nanofabrication"
            ],
            projects: [],
            companies: [],
            websites: [],
            institutes: []
        },
        "prof_ece_4": {
            id: "prof_ece_4",
            name: "Bratin Ghosh",
            position: "Professor",
            email: "bghosh@ece.iitkgp.ac.in",
            degree: "Ph.D.",
            branch: "branch_ece",
            departmentId: "dept_ece",
            description: "Full-wave analysis and design of efficient antennas, guided systems, antenna miniaturization, numerical electromagnetics, dielectric resonator antennas, and slot antenna technologies.",
            photo: "/ece/download(3).png",
            links: {
                webpage: "https://www.iitkgp.ac.in/department/EC/faculty/ec-bghosh",
                awards: "",
                bio: ""
            },
            research: [
                "Efficient antennas",
                "Guided systems",
                "Antenna miniaturization",
                "Numerical electromagnetics",
                "Dielectric resonator antennas",
                "Slot antenna technologies"
            ],
            projects: [],
            companies: [],
            websites: [],
            institutes: []
        },
        "prof_ece_5": {
            id: "prof_ece_5",
            name: "Debashis Sen",
            position: "Associate Professor",
            email: "dsen@ece.iitkgp.ac.in",
            degree: "Ph.D.",
            branch: "branch_ece",
            departmentId: "dept_ece",
            description: "Deep learning-based 3D digital restoration, hyperspectral image quality improvement, artificial visual scanpath generation for action recognition, robotic systems for hazardous manufacturing, and multi-sensor integration. Heavy focus on deep learning, image analysis, and advanced manufacturing.",
            photo: "/ece/download(4).png",
            links: {
                webpage: "https://www.iitkgp.ac.in/department/EC/faculty/ec-dsen",
                awards: "",
                bio: ""
            },
            research: [
                "Deep learning",
                "3D digital restoration",
                "Hyperspectral imaging",
                "Action recognition",
                "Robotic systems",
                "Multi-sensor integration"
            ],
            projects: [],
            companies: [],
            websites: [],
            institutes: []
        },
        "prof_ece_6": {
            id: "prof_ece_6",
            name: "Goutam Saha",
            position: "Professor",
            email: "gsaha@ece.iitkgp.ac.in",
            degree: "Ph.D.",
            branch: "branch_ece",
            departmentId: "dept_ece",
            description: "Biomedical signal processing, speech/audio signal processing, pattern recognition, biometric authentication, healthcare technologies, and related machine learning.",
            photo: "/ece/download(5).png",
            links: {
                webpage: "https://www.iitkgp.ac.in/department/EC/faculty/ec-gsaha",
                awards: "",
                bio: ""
            },
            research: [
                "Biomedical signal processing",
                "Speech processing",
                "Audio signal processing",
                "Pattern recognition",
                "Biometric authentication",
                "Healthcare technologies"
            ],
            projects: [],
            companies: [],
            websites: [],
            institutes: []
        },
        "prof_ece_7": {
            id: "prof_ece_7",
            name: "Indrajit Chakrabarti",
            position: "Professor",
            email: "indrajit@ece.iitkgp.ac.in",
            degree: "Ph.D.",
            branch: "branch_ece",
            departmentId: "dept_ece",
            description: "Hardware security in networking, low-power VLSI design, radio frequency ICs, mixed signal/RF IC design, modem design, wireless communication, VLSI architectures for image/video processing, and analog spiking neural network applications to low-power computing.",
            photo: "/ece/download(6).png",
            links: {
                webpage: "https://www.iitkgp.ac.in/department/EC/faculty/ec-indrajit",
                awards: "",
                bio: ""
            },
            research: [
                "Hardware security",
                "Low-power VLSI design",
                "Radio frequency ICs",
                "Mixed signal/RF IC design",
                "Wireless communication",
                "VLSI architectures",
                "Spiking neural networks"
            ],
            projects: [],
            companies: [],
            websites: [],
            institutes: []
        },
        "prof_ece_8": {
            id: "prof_ece_8",
            name: "Jithin R",
            position: "Assistant Professor Grade-I",
            email: "jithin@ece.iitkgp.ac.in",
            degree: "Ph.D.",
            branch: "branch_ece",
            departmentId: "dept_ece",
            description: "Information theory, wireless communication, privacy in coded caching and function computation, secure function computation, scaling laws for many-access channels, and network coding.",
            photo: "/ece/download(7).png",
            links: {
                webpage: "https://www.iitkgp.ac.in/department/EC/faculty/ec-jithin",
                awards: "",
                bio: ""
            },
            research: [
                "Information theory",
                "Wireless communication",
                "Privacy in coded caching",
                "Secure function computation",
                "Scaling laws",
                "Network coding"
            ],
            projects: [],
            companies: [],
            websites: [],
            institutes: []
        },
        "prof_ece_9": {
            id: "prof_ece_9",
            name: "Mrinal Kanti Mandal",
            position: "Professor",
            email: "mkmandal@ece.iitkgp.ac.in",
            degree: "Ph.D.",
            branch: "branch_ece",
            departmentId: "dept_ece",
            description: "Microwave and millimeter-wave circuits, antenna design, filters (low-pass, band-pass, stop-band), SIW power dividers, reconfigurable antennas, and planar circuit technologies.",
            photo: "/ece/download(8).png",
            links: {
                webpage: "https://www.iitkgp.ac.in/department/EC/faculty/ec-mkmandal",
                awards: "",
                bio: ""
            },
            research: [
                "Microwave circuits",
                "Millimeter-wave circuits",
                "Antenna design",
                "Filters",
                "SIW power dividers",
                "Reconfigurable antennas",
                "Planar circuit technologies"
            ],
            projects: [],
            companies: [],
            websites: [],
            institutes: []
        },
        "prof_ece_10": {
            id: "prof_ece_10",
            name: "Mrityunjoy Chakraborty",
            position: "Professor",
            email: "mrityun@ece.iitkgp.ac.in",
            degree: "Ph.D.",
            branch: "branch_ece",
            departmentId: "dept_ece",
            description: "Digital and adaptive signal processing, VLSI signal processing, compressive sensing, sparse system identification, cooperative adaptive estimation algorithms, radar pulse parameter estimation.",
            photo: "/ece/download(9).png",
            links: {
                webpage: "https://www.iitkgp.ac.in/department/EC/faculty/ec-mrityun",
                awards: "",
                bio: ""
            },
            research: [
                "Digital signal processing",
                "Adaptive signal processing",
                "VLSI signal processing",
                "Compressive sensing",
                "Sparse system identification",
                "Radar pulse parameter estimation"
            ],
            projects: [],
            companies: [],
            websites: [],
            institutes: []
        },
        "prof_ece_11": {
            id: "prof_ece_11",
            name: "Prasanta Kumar Guha",
            position: "Professor",
            email: "pkguha@ece.iitkgp.ac.in",
            degree: "Ph.D.",
            branch: "branch_ece",
            departmentId: "dept_ece",
            description: "Nanomaterial-based sensors/devices, flexible microdevices, energy devices, biomedical sensors, photonic sensors, VLSI design, chemiresistive gas sensors, supercapacitor nano devices, and energy storage.",
            photo: "/ece/download(10).png",
            links: {
                webpage: "https://www.iitkgp.ac.in/department/EC/faculty/ec-pkguha",
                awards: "",
                bio: ""
            },
            research: [
                "Nanomaterial sensors",
                "Flexible microdevices",
                "Energy devices",
                "Biomedical sensors",
                "Photonic sensors",
                "VLSI design",
                "Chemiresistive gas sensors",
                "Supercapacitor nano devices"
            ],
            projects: [],
            companies: [],
            websites: [],
            institutes: []
        },
        "prof_ece_12": {
            id: "prof_ece_12",
            name: "Raja Datta",
            position: "Professor",
            email: "rajadatta@ece.iitkgp.ac.in",
            degree: "Ph.D.",
            branch: "branch_ece",
            departmentId: "dept_ece",
            description: "Software-defined networks, edge computing, inter-planetary networks, elastic optical networks, vehicular ad hoc networks, mobile ad hoc network security, routing, and IoT-enabled sensor techniques.",
            photo: "/ece/download(11).png",
            links: {
                webpage: "https://www.iitkgp.ac.in/department/EC/faculty/ec-rajadatta",
                awards: "",
                bio: ""
            },
            research: [
                "Software-defined networks",
                "Edge computing",
                "Inter-planetary networks",
                "Elastic optical networks",
                "Vehicular ad hoc networks",
                "Mobile ad hoc network security",
                "IoT-enabled sensor techniques"
            ],
            projects: [],
            companies: [],
            websites: [],
            institutes: []
        },
        "prof_ece_13": {
            id: "prof_ece_13",
            name: "Sarang Pendharker",
            position: "Assistant Professor Grade-I",
            email: "sarang@ece.iitkgp.ac.in",
            degree: "Ph.D.",
            branch: "branch_ece",
            departmentId: "dept_ece",
            description: "Optical physics and communication engineering at the electromagnetic wave-matter interface, developing next-gen communication technologies, optically reconfigured microstrip circuits/devices, photonics, and reconfigurable microwave devices.",
            photo: "/ece/download(12).png",
            links: {
                webpage: "https://www.iitkgp.ac.in/department/EC/faculty/ec-sarang",
                awards: "",
                bio: ""
            },
            research: [
                "Optical physics",
                "Communication engineering",
                "Electromagnetic wave-matter interface",
                "Optically reconfigured circuits",
                "Photonics",
                "Reconfigurable microwave devices"
            ],
            projects: [],
            companies: [],
            websites: [],
            institutes: []
        },
        "prof_ece_14": {
            id: "prof_ece_14",
            name: "Shailendra Kumar Varshney",
            position: "Professor",
            email: "skvarshney@ece.iitkgp.ac.in",
            degree: "Ph.D.",
            branch: "branch_ece",
            departmentId: "dept_ece",
            description: "Quantum optics, micromachines, energy harvesting functional materials, integrated photonics, nanorobotics, fiber optic sensors, metamaterials, perovskite solar cells, underwater optical wireless comm., experimental photonics, 4D printing, micro manufacturing.",
            photo: "/ece/download(13).png",
            links: {
                webpage: "https://www.iitkgp.ac.in/department/EC/faculty/ec-skvarshney",
                awards: "",
                bio: ""
            },
            research: [
                "Quantum optics",
                "Micromachines",
                "Energy harvesting materials",
                "Integrated photonics",
                "Nanorobotics",
                "Fiber optic sensors",
                "Metamaterials",
                "Perovskite solar cells",
                "4D printing"
            ],
            projects: [],
            companies: [],
            websites: [],
            institutes: []
        },
        "prof_ece_15": {
            id: "prof_ece_15",
            name: "Sharba Bandyopadhyay",
            position: "Assistant Professor Grade-I",
            email: "sharba@ece.iitkgp.ac.in",
            degree: "Ph.D.",
            branch: "branch_ece",
            departmentId: "dept_ece",
            description: "Neurobiology, auditory neuroscience, auditory neural processing, cognitive neuroscience, neurophysiology, affective neuroscience. Focus on physiological/cognitive data analysis and neural plasticity in auditory systems.",
            photo: "/ece/download(14).png",
            links: {
                webpage: "https://www.iitkgp.ac.in/department/EC/faculty/ec-sharba",
                awards: "",
                bio: ""
            },
            research: [
                "Neurobiology",
                "Auditory neuroscience",
                "Cognitive neuroscience",
                "Neurophysiology",
                "Affective neuroscience",
                "Neural plasticity"
            ],
            projects: [],
            companies: [],
            websites: [],
            institutes: []
        },
        "prof_ece_16": {
            id: "prof_ece_16",
            name: "Subhadip Mukherjee",
            position: "Assistant Professor Grade-I",
            email: "smukherjee@ece.iitkgp.ac.in",
            degree: "Ph.D.",
            branch: "branch_ece",
            departmentId: "dept_ece",
            description: "Deep learning for inverse problems in medical imaging (CT, low-dose/sparse projections), data-driven image reconstruction, optimization and statistics for clinical applications, integration of machine learning with regularization theory, and robust algorithms for high-dimensional signal estimation.",
            photo: "/ece/download(15).png",
            links: {
                webpage: "https://www.iitkgp.ac.in/department/EC/faculty/ec-smukherjee",
                awards: "",
                bio: ""
            },
            research: [
                "Deep learning for inverse problems",
                "Medical imaging",
                "Data-driven image reconstruction",
                "Optimization and statistics",
                "Regularization theory",
                "High-dimensional signal estimation"
            ],
            projects: [],
            companies: [],
            websites: [],
            institutes: []
        },
        "prof_ece_17": {
            id: "prof_ece_17",
            name: "Sudipta Mukhopadhyay",
            position: "Professor",
            email: "smukho@ece.iitkgp.ac.in",
            degree: "Ph.D.",
            branch: "branch_ece",
            departmentId: "dept_ece",
            description: "Medical image processing, video restoration, image quality metrics, content-based image retrieval (especially for CT/lung images), autonomous tools for radiologists, feature extraction for image retrieval, video coding, and medical imaging algorithms.",
            photo: "/ece/download(16).png",
            links: {
                webpage: "https://www.iitkgp.ac.in/department/EC/faculty/ec-smukho",
                awards: "",
                bio: ""
            },
            research: [
                "Medical image processing",
                "Video restoration",
                "Image quality metrics",
                "Content-based image retrieval",
                "Autonomous tools for radiologists",
                "Video coding"
            ],
            projects: [],
            companies: [],
            websites: [],
            institutes: []
        },
        "prof_ece_18": {
            id: "prof_ece_18",
            name: "Tarun Kanti Bhattacharyya",
            position: "Professor",
            email: "tkb@ece.iitkgp.ac.in",
            degree: "Ph.D.",
            branch: "branch_ece",
            departmentId: "dept_ece",
            description: "MEMS/microsystems, RF/analog VLSI, nanoelectronics, nano-bio sensors, energy storage/harvesting, thin films, biosystem engineering, sensors/actuators for aerospace; leads multidisciplinary labs for VLSI, high-performance devices, and nano-bio applications.",
            photo: "/ece/download(17).png",
            links: {
                webpage: "https://www.iitkgp.ac.in/department/EC/faculty/ec-tkb",
                awards: "",
                bio: ""
            },
            research: [
                "MEMS/microsystems",
                "RF/analog VLSI",
                "Nanoelectronics",
                "Nano-bio sensors",
                "Energy storage/harvesting",
                "Biosystem engineering",
                "Sensors/actuators for aerospace"
            ],
            projects: [],
            companies: [],
            websites: [],
            institutes: []
        },
        "prof_ece_19": {
            id: "prof_ece_19",
            name: "Vivek Dixit",
            position: "Associate Professor",
            email: "vdixit@ece.iitkgp.ac.in",
            degree: "Ph.D.",
            branch: "branch_ece",
            departmentId: "dept_ece",
            description: "Semiconductor devices modeling/simulation, silicon photonics, THz technology, metamaterials, photonic devices, low-loss silicon modulators, reconfigurable microwave/photonics structures, and eye diagram simulation for electro-optic signals.",
            photo: "/ece/download(18).png",
            links: {
                webpage: "https://www.iitkgp.ac.in/department/EC/faculty/ec-vdixit",
                awards: "",
                bio: ""
            },
            research: [
                "Semiconductor devices modeling",
                "Silicon photonics",
                "THz technology",
                "Metamaterials",
                "Photonic devices",
                "Low-loss silicon modulators",
                "Reconfigurable microwave structures"
            ],
            projects: [],
            companies: [],
            websites: [],
            institutes: []
        }
    },
    news: []
};
