import { getAllPosts } from '@/lib/blog';

export default function BlogIndex() {
	const posts = getAllPosts();

	return (
		<main className="mx-auto max-w-5xl px-4 py-12">
			{/* Hero */}
			<section className="relative overflow-hidden rounded-2xl border border-gray-200 dark:border-gray-800 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 p-[1px] mb-10">
				<div className="rounded-2xl bg-white dark:bg-gray-900 px-6 py-10 md:px-12">
					<h1 className="text-3xl md:text-4xl font-bold tracking-tight text-gray-900 dark:text-white">Insights, releases, and tips from Learnify</h1>
					<p className="mt-3 text-gray-700 dark:text-gray-300 max-w-3xl">Deep dives on learning design, product updates, and how to get the most from your courses.</p>
				</div>
			</section>

			{posts.length === 0 ? (
				<p className="text-gray-600 dark:text-gray-300">No posts yet.</p>
			) : (
				<div className="grid gap-6 md:grid-cols-2">
					{posts.map(post => (
						<a key={post.slug} href={`/blog/${post.slug}`} className="group relative overflow-hidden rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-7 transition hover:shadow-lg">
							<div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
								<span className="rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-2 py-0.5">Article</span>
								<span>{new Date(post.date).toLocaleDateString()}</span>
							</div>
							<h2 className="mt-2 text-xl font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">{post.title}</h2>
							<p className="mt-2 line-clamp-3 text-gray-700 dark:text-gray-300">{post.description}</p>
							<div className="mt-4 flex flex-wrap gap-2">
								{post.tags?.slice(0, 3).map(tag => (
									<span key={tag} className="text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1">#{tag}</span>
								))}
							</div>
						</a>
					))}
				</div>
			)}
		</main>
	);
}


