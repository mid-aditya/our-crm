import { AlertDialog as AlertDialogPrimitive } from 'bits-ui';
import Content from './alert-dialog-content.svelte';
import Title from './alert-dialog-title.svelte';
import Description from './alert-dialog-description.svelte';
import Action from './alert-dialog-action.svelte';
import Cancel from './alert-dialog-cancel.svelte';

const Root = AlertDialogPrimitive.Root;

export {
	Root,
	Content,
	Title,
	Description,
	Action,
	Cancel,
	//
	Root as AlertDialog,
	Content as AlertDialogContent,
	Title as AlertDialogTitle,
	Description as AlertDialogDescription,
	Action as AlertDialogAction,
	Cancel as AlertDialogCancel
};
