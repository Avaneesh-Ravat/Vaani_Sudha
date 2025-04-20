class A{
    public void hello(){
        System.out.println("in a");
    }
}

class B extends A{
    protected void hello(){
        System.out.println("in b");
    }
}

class main{
    public static void main(String[] args){
        A b1 = new B();
        b1.hello();
    }
}