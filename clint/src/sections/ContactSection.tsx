'use client'
import { useState } from "react";
import SectionTitle from "../components/SectionTitle";
import { ArrowRightIcon, MailIcon, UserIcon, CheckCircleIcon } from "lucide-react";
import { motion } from "motion/react";

export default function ContactSection() {
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitted(true);
    };

    return (
        <div className="px-4 md:px-16 lg:px-24 xl:px-32">
            <SectionTitle text1="Contact" text2="Reach out to us" text3="Have questions? We're here to help." />

            {isSubmitted ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="max-w-xl mx-auto mt-16 p-8 bg-green-500/10 border border-green-500/20 rounded-2xl text-center"
                >
                    <div className="w-16 h-16 mx-auto mb-4 bg-green-500/20 rounded-full flex items-center justify-center">
                        <CheckCircleIcon className="size-8 text-green-400" />
                    </div>
                    <h3 className="text-2xl font-semibold text-white mb-2">Message Sent!</h3>
                    <p className="text-slate-300">Thanks for reaching out. We'll get back to you shortly.</p>
                    <button
                        onClick={() => setIsSubmitted(false)}
                        className="mt-6 text-sm text-pink-500 hover:text-pink-400 font-medium"
                    >
                        Send another message
                    </button>
                </motion.div>
            ) : (
                <form onSubmit={handleSubmit} className='grid sm:grid-cols-2 gap-3 sm:gap-5 max-w-2xl mx-auto text-slate-300 mt-16 w-full' >
                    <motion.div
                        initial={{ y: 150, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ type: "spring", stiffness: 320, damping: 70, mass: 1 }}
                    >
                        <p className='mb-2 font-medium'>Your name</p>
                        <div className='flex items-center pl-3 rounded-lg border border-slate-700 focus-within:border-pink-500'>
                            <UserIcon className='size-5' />
                            <input required name='name' type="text" placeholder='Enter your name' className='w-full p-3 outline-none bg-transparent' />
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ y: 150, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ type: "spring", stiffness: 280, damping: 70, mass: 1 }}
                    >
                        <p className='mb-2 font-medium'>Email id</p>
                        <div className='flex items-center pl-3 rounded-lg border border-slate-700 focus-within:border-pink-500'>
                            <MailIcon className='size-5' />
                            <input required name='email' type="email" placeholder='Enter your email' className='w-full p-3 outline-none bg-transparent' />
                        </div>
                    </motion.div>

                    <motion.div className='sm:col-span-2'
                        initial={{ y: 150, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ type: "spring", stiffness: 240, damping: 70, mass: 1 }}
                    >
                        <p className='mb-2 font-medium'>Message</p>
                        <textarea required name='message' rows={8} placeholder='Enter your message' className='focus:border-pink-500 resize-none w-full p-3 outline-none rounded-lg border border-slate-700 bg-transparent' />
                    </motion.div>

                    <motion.div className="sm:col-span-2 flex justify-start"
                        initial={{ y: 150, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        viewport={{ once: true }}
                        transition={{ type: "spring", stiffness: 280, damping: 70, mass: 1 }}
                    >
                        <button type='submit' className='w-max flex items-center gap-2 bg-pink-600 hover:bg-pink-700 text-white px-10 py-3 rounded-full cursor-pointer transition-colors'>
                            Submit
                            <ArrowRightIcon className="size-5" />
                        </button>
                    </motion.div>
                </form>
            )}
        </div>
    );
}