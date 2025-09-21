'use client';
import React, { useState, useEffect } from 'react';
import data from './data.json';
import { FaArrowRight } from 'react-icons/fa';
import { useRouter } from 'next/navigation';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import app from '../../../config.js';
import axios from 'axios';

const Rec = () => {
  const [topProblems, setTopProblems] = useState([]);
  const [userData, setUserData] = useState(null);
  const router = useRouter();
  const auth = getAuth(app);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      const unsubscribe = onAuthStateChanged(auth, async (user) => {
        if (user) {
          setUser(user);
          try {
            const response = await fetch('http://127.0.0.1:8080/getSolvedQuestions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ email: user.email }),
            });
            const userResponseData = await response.json();

            if (userResponseData.status) {
              setUserData(userResponseData);
            } else {
              console.error('Failed to fetch user data');
            }

            const solvedQuestions = userResponseData.solved_questions || ["two-sum", "add-two-integers"];

            const recResponse = await axios.post('http://127.0.0.1:5000/recommend', {
              solved_questions: solvedQuestions,
              count: 10,
            });

            const recommendedSlugs = recResponse.data.recommendations
              .map(([slug]) => slug)
              .slice(0, 10);

            const recommendedProblems = Object.values(data)
              .filter((problem) => recommendedSlugs.includes(problem.titleSlug))
              .map((problem) => ({
                ...problem,
                solved: false,
                expanded: false,
              }));

            setTopProblems(recommendedProblems);
          } catch (error) {
            console.error('Error fetching user or recommendations:', error);
          }
        } else {
          router.push('/register');
        }
      });

      return () => unsubscribe();
    };

    fetchUserData();
  }, [auth, router]);

  const toggleSolved = async (index) => {
    const problem = topProblems[index];
    const email = user.email;
    if (!email) return;

    try {
      let response;

      if (problem.solved) {
        response = await axios.post('http://127.0.0.1:8080/removeSolvedQuestion', {
          email: email,
          question_slug: problem.titleSlug,
        });
      } else {
        response = await axios.post('http://127.0.0.1:8080/addSolvedQuestion', {
          email: email,
          question_slug: problem.titleSlug,
        });
      }

      if (response.data.status) {
        setTopProblems((prevProblems) =>
          prevProblems.map((p, i) =>
            i === index ? { ...p, solved: !p.solved } : p
          )
        );
      } else {
        console.error('Failed to update solved status');
      }
    } catch (error) {
      console.error('Error toggling solved status:', error);
    }
  };

  const toggleExpanded = (index) => {
    setTopProblems((prevProblems) =>
      prevProblems.map((problem, i) =>
        i === index ? { ...problem, expanded: !problem.expanded } : problem
      )
    );
  };

  return (
    <div className="bg-gray-900 py-10 px-[10%] text-white w-full flex items-center justify-center">
      <div className="mx-auto w-full text-black p-5 rounded-xl bg-white shadow-lg">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 flex items-center justify-center space-x-2">
            <span>🚀</span>
            <span>Leetcode Question Recommender</span>
            <span>🧠</span>
          </h1>
          <p className="text-gray-600 text-lg mt-4">
            Your personalized guide to mastering coding problems! 💻✨
          </p>
        </div>
        <ul className="space-y-6">
          {topProblems.map((problem, index) => (
            <li
              key={problem.questionId}
              className="p-5 bg-gray-100 border border-gray-300 rounded-lg shadow-sm hover:shadow-xl transition-all duration-300 ease-in-out"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2
                    className="text-xl font-semibold cursor-pointer text-gray-800"
                    onClick={() => toggleExpanded(index)}
                  >
                    {index + 1}. {problem.title}
                  </h2>
                  <div className="flex gap-2 items-center mt-2 flex-wrap">
                    <span
                      className={`inline-block px-3 py-1 text-sm rounded text-white 
                        ${
                          problem.difficulty === 'easy'
                            ? 'bg-green-500'
                            : problem.difficulty === 'medium'
                            ? 'bg-yellow-500'
                            : 'bg-red-500'
                        }`}
                    >
                      {problem.difficulty === 'easy'
                        ? 'Easy'
                        : problem.difficulty === 'medium'
                        ? 'Medium'
                        : 'Hard'}
                    </span>
                    {problem.topics.slice(0, 5).map((topic, index) => (
                      <span
                        key={index}
                        className="px-3 py-1 text-sm rounded border border-black bg-white text-black"
                      >
                        {topic}
                      </span>
                    ))}
                    {problem.topics.length > 5 && (
                      <span className="text-blue-500">+{problem.topics.length - 5} more</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => toggleSolved(index)}
                    className={`py-2 px-4 rounded-lg text-white ${
                      problem.solved ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  >
                    {problem.solved ? 'Mark Unsolved' : 'Mark Solved'}
                  </button>
                  <div className="flex items-center gap-2">
                    <a
                      target="_blank"
                      rel="noopener noreferrer"
                      href={`${problem.link}`}
                      className="flex items-center text-blue-500 hover:text-blue-700 transition-all duration-200"
                    >
                      <FaArrowRight className="w-8 h-8 -rotate-45" />
                    </a>
                  </div>
                </div>
              </div>
              <div
                className={`transition-all duration-500 ease-in-out overflow-hidden ${
                  problem.expanded ? 'max-h-screen' : 'max-h-0'
                }`}
              >
                <div className="mt-4">
                  <p
                    className="text-gray-800"
                    dangerouslySetInnerHTML={{ __html: problem.question }}
                  />
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default Rec;
