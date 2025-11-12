namespace VideoCall.Application.Interfaces
{
    public interface IRepository<T>
    {
         IReadOnlyList<T> GetAll();
    }
}
