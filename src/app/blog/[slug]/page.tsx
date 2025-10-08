import { getPost } from '@/lib/blog';

export default function BlogPostPage({ params }: { params: { slug: string } }) {
	const post = getPost(params.slug);
	if (!post) {
		return (
			<main className="mx-auto max-w-3xl px-4 py-10">
				<p className="text-gray-700 dark:text-gray-300">Post not found.</p>
			</main>
		);
	}
	return (
		<main className="mx-auto max-w-4xl px-4 py-10">
			<header className="mb-8">
				<div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
					<span className="rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 px-2 py-0.5">Article</span>
					<span>{new Date(post.date).toLocaleDateString()}</span>
					<span>•</span>
					<span>{post.readMinutes} min read</span>
				</div>
				<h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white leading-tight">{post.title}</h1>
				{post.tags && (
					<div className="mt-3 flex flex-wrap gap-2">
						{post.tags.map(tag => (
							<span key={tag} className="text-xs rounded-full bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 px-2 py-1">#{tag}</span>
						))}
					</div>
				)}
			</header>
			<article className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 md:p-8 shadow-sm">
				<div className="prose prose-indigo dark:prose-invert max-w-none prose-headings:scroll-mt-24 prose-img:rounded-lg" dangerouslySetInnerHTML={{ __html: post.html }} />
				<div className="mt-8 flex items-center justify-between border-t pt-4 border-gray-100 dark:border-gray-800">
					<span className="text-sm text-gray-500 dark:text-gray-400">Enjoyed this article? Share it.</span>
					<div className="flex gap-2">
						<a className="text-sm rounded-md px-3 py-1.5 bg-indigo-600 text-white hover:bg-indigo-700" href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`} target="_blank" rel="noreferrer">Share on X</a>
						<a className="text-sm rounded-md px-3 py-1.5 bg-green-600 text-white hover:bg-green-700" href={`https://api.whatsapp.com/send?text=${encodeURIComponent(post.title)}`} target="_blank" rel="noreferrer">Share on WhatsApp</a>
					</div>
				</div>
			</article>
		</main>
	);
}


